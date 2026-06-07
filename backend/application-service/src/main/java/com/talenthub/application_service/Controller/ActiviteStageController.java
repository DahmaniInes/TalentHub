package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ActiviteStageDTO;
import com.talenthub.application_service.Security.RequiresPermission;
import com.talenthub.application_service.Service.ActiviteStageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/activites-stage")
@RequiredArgsConstructor
public class ActiviteStageController {

    private final ActiviteStageService service;

    // ── Toutes les activités — ADMIN ──────────────────────────────────
    @RequiresPermission("INT_ADMIN_ACT_VIEW_ALL")
    @GetMapping
    public ResponseEntity<List<ActiviteStageDTO>> getAll() {
        return ResponseEntity.ok(service.getAll().stream().map(ActiviteStageDTO::new).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActiviteStageDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new ActiviteStageDTO(service.getById(id)));
    }

    // ── Par projet — superviseur/stagiaire ────────────────────────────
    @GetMapping("/projet/{projetId}")
    public ResponseEntity<List<ActiviteStageDTO>> getByProjet(@PathVariable Long projetId) {
        return ResponseEntity.ok(service.getByProjet(projetId).stream()
                .map(ActiviteStageDTO::new).toList());
    }

    // ── Activités d'un user (stagiaire/superviseur) ───────────────────
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ActiviteStageDTO>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(service.getByUserId(userId).stream()
                .map(ActiviteStageDTO::new).toList());
    }

    // ── Créer ─────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<ActiviteStageDTO> create(@RequestBody Map<String, Object> body) {
        return new ResponseEntity<>(new ActiviteStageDTO(service.create(body)), HttpStatus.CREATED);
    }

    // ── Modifier ──────────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<ActiviteStageDTO> update(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(new ActiviteStageDTO(service.update(id, body)));
    }

    // ── Supprimer ─────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}