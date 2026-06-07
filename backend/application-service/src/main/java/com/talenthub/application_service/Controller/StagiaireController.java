package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.UtilisateurResponseDTO;
import com.talenthub.application_service.Security.RequiresPermission;
import com.talenthub.application_service.Service.StagiaireService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stagiaires")
public class StagiaireController {

    private final StagiaireService service;
    public StagiaireController(StagiaireService service) { this.service = service; }

    // ── Tous les stagiaires — ADMIN seulement ─────────────────────────
    @RequiresPermission("INT_ADMIN_VIEW_ALL_INTERNS")
    @GetMapping
    public ResponseEntity<List<UtilisateurResponseDTO>> getAll() {
        return ResponseEntity.ok(service.getAllStagiaires().stream()
                .map(UtilisateurResponseDTO::new).toList());
    }

    // ── Mes stagiaires — SUPERVISEUR ──────────────────────────────────
    @RequiresPermission("INT_SUPER_VIEW_MY_INTERNS")
    @GetMapping("/mes-stagiaires/{superviseurId}")
    public ResponseEntity<List<UtilisateurResponseDTO>> getMes(@PathVariable Long superviseurId) {
        return ResponseEntity.ok(service.getMesStagiaires(superviseurId).stream()
                .map(UtilisateurResponseDTO::new).toList());
    }

    // ── Superviseurs éligibles — accessible à tous (utilisé dans les selects) ──
    @GetMapping("/superviseurs")
    public ResponseEntity<List<UtilisateurResponseDTO>> getSuperviseurs() {
        return ResponseEntity.ok(service.getSuperviseurs().stream()
                .map(UtilisateurResponseDTO::new).toList());
    }

    // ── Mise à jour infos stagiaire ───────────────────────────────────
    @RequiresPermission("INT_ADMIN_VIEW_ALL_INTERNS")
    @PatchMapping("/{id}")
    public ResponseEntity<UtilisateurResponseDTO> update(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(new UtilisateurResponseDTO(service.updateStagiaire(id, body)));
    }

    // ── Assigner superviseurs ─────────────────────────────────────────
    @RequiresPermission("INT_ADMIN_ASSIGN_SUPERVISOR")
    @PutMapping("/{id}/superviseurs")
    public ResponseEntity<UtilisateurResponseDTO> assignerSuperviseurs(
            @PathVariable Long id, @RequestBody List<Long> superviseurIds) {
        return ResponseEntity.ok(new UtilisateurResponseDTO(service.assignerSuperviseurs(id, superviseurIds)));
    }

    // ── Retirer un superviseur ────────────────────────────────────────
    @RequiresPermission("INT_ADMIN_ASSIGN_SUPERVISOR")
    @DeleteMapping("/{id}/superviseurs/{superviseurId}")
    public ResponseEntity<UtilisateurResponseDTO> retirerSuperviseur(
            @PathVariable Long id, @PathVariable Long superviseurId) {
        return ResponseEntity.ok(new UtilisateurResponseDTO(service.retirerSuperviseur(id, superviseurId)));
    }
}