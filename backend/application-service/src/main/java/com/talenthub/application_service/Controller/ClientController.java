// Controller/ClientController.java — COMPLET avec PermissionContext (pas jwt.getClaim)
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ClientDTO;
import com.talenthub.application_service.Entity.Client;
import com.talenthub.application_service.Security.PermissionContext;
import com.talenthub.application_service.Security.RequiresPermission;
import com.talenthub.application_service.Service.ClientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService     clientService;
    private final PermissionContext permCtx;

    // ── GET liste — CUSTOMER_VIEW | CUSTOMER_DETAILS | PROJECT_* ──
    @GetMapping
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Boolean actif) {
        if (!permCtx.has("CUSTOMER_VIEW") && !permCtx.has("CUSTOMER_DETAILS")
                && !permCtx.has("PROJECT_CREATE") && !permCtx.has("PROJECT_EDIT_ALL")
                && !permCtx.has("PROJECT_VIEW_ALL") && !permCtx.has("PROJECT_VIEW_OWN")
                && !permCtx.has("PROJECT_VIEW_LEAD")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission CUSTOMER_VIEW requise."));
        }
        List<Client> list = (actif != null && actif)
                ? clientService.getAllActifs()
                : clientService.getAll();
        return ResponseEntity.ok(list.stream().map(ClientDTO::new).toList());
    }

    // ── GET détail — CUSTOMER_DETAILS | CUSTOMER_VIEW | PROJECT_VIEW_* ──
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        if (!permCtx.has("CUSTOMER_DETAILS") && !permCtx.has("CUSTOMER_VIEW")
                && !permCtx.has("PROJECT_VIEW_ALL") && !permCtx.has("PROJECT_VIEW_LEAD")
                && !permCtx.has("PROJECT_VIEW_OWN")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission CUSTOMER_DETAILS requise."));
        }
        return ResponseEntity.ok(new ClientDTO(clientService.getByIdWithProjets(id)));
    }

    // ── POST créer — CUSTOMER_CREATE ──────────────────────────────
    @RequiresPermission("CUSTOMER_CREATE")
    @PostMapping
    public ResponseEntity<ClientDTO> create(@RequestBody Client client) {
        return new ResponseEntity<>(new ClientDTO(clientService.create(client)), HttpStatus.CREATED);
    }

    // ── PUT modifier — CUSTOMER_UPDATE ────────────────────────────
    @RequiresPermission("CUSTOMER_UPDATE")
    @PutMapping("/{id}")
    public ResponseEntity<ClientDTO> update(@PathVariable Long id,
                                            @RequestBody Client client) {
        return ResponseEntity.ok(new ClientDTO(clientService.update(id, client)));
    }

    // ── DELETE — CUSTOMER_DELETE ───────────────────────────────────
    @RequiresPermission("CUSTOMER_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        clientService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── PATCH toggle actif — CUSTOMER_UPDATE ──────────────────────
    @RequiresPermission("CUSTOMER_UPDATE")
    @PatchMapping("/{id}/toggle-actif")
    public ResponseEntity<ClientDTO> toggleActif(@PathVariable Long id) {
        return ResponseEntity.ok(new ClientDTO(clientService.toggleActif(id)));
    }
}