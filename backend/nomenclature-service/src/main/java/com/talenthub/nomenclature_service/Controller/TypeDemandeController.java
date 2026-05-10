// nomenclature-service/.../Controller/TypeDemandeController.java — REMPLACE
package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.DTO.TypeDemandeDTO;
import com.talenthub.nomenclature_service.DTO.TypeDemandeRequest;
import com.talenthub.nomenclature_service.Security.RequiresPermission;
import com.talenthub.nomenclature_service.Service.TypeDemandeService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

@RestController
@RequestMapping("/types-demande")
public class TypeDemandeController {

    private final TypeDemandeService service;

    public TypeDemandeController(TypeDemandeService service) {
        this.service = service;
    }

    // ✅ Lecture publique — tous les utilisateurs authentifiés
    @GetMapping
    public ResponseEntity<List<TypeDemandeDTO>> getAll() {
        return ResponseEntity.ok(service.getAll().stream()
                .map(TypeDemandeDTO::new).toList());
    }

    @GetMapping("/actifs")
    public ResponseEntity<List<TypeDemandeDTO>> getActifs() {
        return ResponseEntity.ok(service.getAllActifs().stream()
                .map(TypeDemandeDTO::new).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TypeDemandeDTO> getById(@PathVariable Long id) {
        return service.getById(id)
                .map(t -> ResponseEntity.ok(new TypeDemandeDTO(t)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequiresPermission("DEMANDE_TYPE_CREATE")
    @PostMapping
    public ResponseEntity<TypeDemandeDTO> create(@Valid @RequestBody TypeDemandeRequest req) {
        return new ResponseEntity<>(new TypeDemandeDTO(service.create(req)), HttpStatus.CREATED);
    }

    @RequiresPermission("DEMANDE_TYPE_UPDATE")
    @PutMapping("/{id}")
    public ResponseEntity<TypeDemandeDTO> update(@PathVariable Long id,
                                                 @Valid @RequestBody TypeDemandeRequest req) {
        return ResponseEntity.ok(new TypeDemandeDTO(service.update(id, req)));
    }

    @RequiresPermission("DEMANDE_TYPE_ACTIVATE")
    @PatchMapping("/{id}/activate")
    public ResponseEntity<TypeDemandeDTO> activate(@PathVariable Long id) {
        return ResponseEntity.ok(new TypeDemandeDTO(service.setActif(id, true)));
    }

    @RequiresPermission("DEMANDE_TYPE_DEACTIVATE")
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<TypeDemandeDTO> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(new TypeDemandeDTO(service.setActif(id, false)));
    }

    @RequiresPermission("DEMANDE_TYPE_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ✅ Export CSV
    @RequiresPermission("DEMANDE_TYPE_EXPORT")
    @GetMapping("/export/csv")
    public void exportCsv(HttpServletResponse response) throws IOException {
        response.setContentType("text/csv;charset=UTF-8");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"types-demandes.csv\"");

        PrintWriter writer = response.getWriter();
        writer.println("ID,Code,Libellé,Description,Actif");

        service.getAll().forEach(t -> writer.printf(
                "%d,%s,%s,%s,%s%n",
                t.getId(),
                t.getCode(),
                t.getLibelle(),
                t.getDescription() != null ? t.getDescription() : "",
                t.isActif() ? "Oui" : "Non"
        ));
        writer.flush();
    }
}