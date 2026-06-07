package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ProjetStageDTO;
import com.talenthub.application_service.Security.RequiresPermission;
import com.talenthub.application_service.Service.ProjetStageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/projets-stage")
@RequiredArgsConstructor
public class ProjetStageController {

    private final ProjetStageService service;

    // ── Tous les projets — ADMIN ──────────────────────────────────────
    @RequiresPermission("INT_ADMIN_PROJ_VIEW_ALL")
    @GetMapping
    public ResponseEntity<List<ProjetStageDTO>> getAll() {
        return ResponseEntity.ok(service.getAll().stream().map(ProjetStageDTO::new).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjetStageDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new ProjetStageDTO(service.getById(id)));
    }

    // ── Projets d'un stagiaire — stagiaire lui-même ───────────────────
    @RequiresPermission("INT_INTERN_VIEW_PROJ")
    @GetMapping("/stagiaire/{stagiaireId}")
    public ResponseEntity<List<ProjetStageDTO>> getByStagiaire(@PathVariable Long stagiaireId) {
        return ResponseEntity.ok(service.getByStagiaire(stagiaireId).stream()
                .map(ProjetStageDTO::new).toList());
    }

    // ── Projets de mes stagiaires — SUPERVISEUR ───────────────────────
    //@RequiresPermission("INT_SUPER_PROJ_VIEW_MY")
    @GetMapping("/superviseur/{superviseurId}")
    public ResponseEntity<List<ProjetStageDTO>> getBySuperviseur(@PathVariable Long superviseurId) {
        return ResponseEntity.ok(service.getBySuperviseur(superviseurId).stream()
                .map(ProjetStageDTO::new).toList());
    }

    // ── Créer — ADMIN ou SUPERVISEUR (gérer) ─────────────────────────
    @PostMapping
    public ResponseEntity<ProjetStageDTO> create(@RequestBody Map<String, Object> body) {
        return new ResponseEntity<>(new ProjetStageDTO(service.create(body)), HttpStatus.CREATED);
    }

    // ── Modifier ──────────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<ProjetStageDTO> update(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(new ProjetStageDTO(service.update(id, body)));
    }

    // ── Assigner un projet existant à un stagiaire ────────────────────
    @RequiresPermission("INT_ADMIN_ASSIGN_PROJECT")
    @PatchMapping("/{id}/assigner/{stagiaireId}")
    public ResponseEntity<ProjetStageDTO> assignerAStagiaire(
            @PathVariable Long id, @PathVariable Long stagiaireId) {
        return ResponseEntity.ok(new ProjetStageDTO(service.assignerAStagiaire(id, stagiaireId)));
    }

    // ── Supprimer ─────────────────────────────────────────────────────
    @RequiresPermission("INT_ADMIN_PROJ_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}