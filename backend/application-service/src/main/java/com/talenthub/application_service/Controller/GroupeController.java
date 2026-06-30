// Controller/GroupeController.java — COMPLET avec GroupeDTO (casse les cycles JSON)
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.GroupeDTO;
import com.talenthub.application_service.DTO.GroupeRequest;
import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Security.PermissionContext;
import com.talenthub.application_service.Security.RequiresPermission;
import com.talenthub.application_service.Service.GroupeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/groupes")
@RequiredArgsConstructor
public class GroupeController {

    private final GroupeService     groupeService;
    private final PermissionContext permCtx;

    // ── GET liste — retourne List<GroupeDTO> pour éviter les cycles JSON ──
    @GetMapping
    public ResponseEntity<?> getAll() {
        // ✅ Élargi pour accepter les permissions de l'espace stagiaire :
        // la page détail d'un projet de stage appelle GET /groupes pour résoudre
        // les groupes/équipes liés au projet, même pour un superviseur ou un stagiaire.
        if (!permCtx.has("TEAM_VIEW") && !permCtx.has("TEAM_MEMBER_VIEW")
                && !permCtx.has("PROJECT_VIEW_ALL") && !permCtx.has("PROJECT_VIEW_LEAD")
                && !permCtx.has("PROJECT_VIEW_OWN") && !permCtx.has("ACTIVITY_VIEW_ALL")
                && !permCtx.has("USER_VIEW")
                && !permCtx.has("INT_ADMIN_PROJ_VIEW_ALL") && !permCtx.has("INT_SUPER_TRACK")
                && !permCtx.has("INT_INTERN_VIEW_PROJ")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission TEAM_VIEW requise."));
        }
        List<GroupeDTO> dtos = groupeService.getAll().stream()
                .map(GroupeDTO::new)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    // ── GET par ID ────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        if (!permCtx.has("TEAM_VIEW") && !permCtx.has("TEAM_MEMBER_VIEW")
                && !permCtx.has("USER_VIEW")
                && !permCtx.has("INT_ADMIN_PROJ_VIEW_ALL") && !permCtx.has("INT_SUPER_TRACK")
                && !permCtx.has("INT_INTERN_VIEW_PROJ")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission TEAM_VIEW requise."));
        }
        return ResponseEntity.ok(new GroupeDTO(groupeService.getById(id)));
    }

    // ── GET par membre ────────────────────────────────────────────
    @GetMapping("/membre/{userId}")
    public ResponseEntity<?> getByMembre(@PathVariable Long userId) {
        if (!permCtx.has("TEAM_VIEW") && !permCtx.has("TEAM_MEMBER_VIEW")
                && !permCtx.has("USER_VIEW_GROUPS")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission TEAM_VIEW requise."));
        }
        List<GroupeDTO> dtos = groupeService.getByMembre(userId).stream()
                .map(GroupeDTO::new)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    // ── POST créer — TEAM_CREATE ──────────────────────────────────
    @RequiresPermission("TEAM_CREATE")
    @PostMapping
    public ResponseEntity<GroupeDTO> create(@RequestBody GroupeRequest req) {
        return new ResponseEntity<>(
                new GroupeDTO(groupeService.create(req)), HttpStatus.CREATED);
    }

    // ── PUT modifier — TEAM_UPDATE ────────────────────────────────
    @RequiresPermission("TEAM_UPDATE")
    @PutMapping("/{id}")
    public ResponseEntity<GroupeDTO> update(@PathVariable Long id,
                                            @RequestBody GroupeRequest req) {
        return ResponseEntity.ok(new GroupeDTO(groupeService.update(id, req)));
    }

    // ── DELETE — TEAM_DELETE ──────────────────────────────────────
    @RequiresPermission("TEAM_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        groupeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── Ajouter membre — TEAM_UPDATE ──────────────────────────────
    @RequiresPermission("TEAM_UPDATE")
    @PostMapping("/{groupeId}/membres/{userId}")
    public ResponseEntity<GroupeDTO> addMembre(@PathVariable Long groupeId,
                                               @PathVariable Long userId) {
        return ResponseEntity.ok(new GroupeDTO(groupeService.addMembre(groupeId, userId)));
    }

    // ── Retirer membre — TEAM_UPDATE ─────────────────────────────
    @RequiresPermission("TEAM_UPDATE")
    @DeleteMapping("/{groupeId}/membres/{userId}")
    public ResponseEntity<GroupeDTO> removeMembre(@PathVariable Long groupeId,
                                                  @PathVariable Long userId) {
        return ResponseEntity.ok(new GroupeDTO(groupeService.removeMembre(groupeId, userId)));
    }

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Dropdown Utilisateur de Ma Semaine, cas TS_GROUP_READ/
    // UPDATE : tous les coéquipiers de l'utilisateur connecté (membres
    // distincts de tous les groupes auxquels il appartient).
    //
    // Permissions TS_* plutôt que TEAM_* : cet endpoint est appelé par
    // n'importe quel employé ayant un droit de feuille de temps étendu,
    // pas seulement par les gestionnaires d'équipes.
    //
    // Retourne GroupeDTO.MembreInfo (déjà existant, léger, sans cycle
    // JSON) plutôt que l'entité Utilisateur brute.
    // ════════════════════════════════════════════════════════════
    @GetMapping("/coequipiers/{utilisateurId}")
    public ResponseEntity<?> getCoequipiers(@PathVariable Long utilisateurId) {
        if (!permCtx.has("TS_GROUP_READ") && !permCtx.has("TS_GROUP_UPDATE")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission TS_GROUP_READ requise."));
        }
        List<GroupeDTO.MembreInfo> dtos = groupeService.getCoequipiersDe(utilisateurId).stream()
                .map(GroupeController::toMembreInfo)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Dropdown Utilisateur de Ma Semaine, cas TS_ALL_READ/
    // UPDATE : tous les utilisateurs membres d'au moins un groupe dans
    // toute l'application.
    // ════════════════════════════════════════════════════════════
    @GetMapping("/tous-membres")
    public ResponseEntity<?> getTousMembres(@RequestParam Long utilisateurConnecteId) {
        if (!permCtx.has("TS_ALL_READ") && !permCtx.has("TS_ALL_UPDATE")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission TS_ALL_READ requise."));
        }
        List<GroupeDTO.MembreInfo> dtos = groupeService.getTousMembresDeGroupes(utilisateurConnecteId).stream()
                .map(GroupeController::toMembreInfo)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    private static GroupeDTO.MembreInfo toMembreInfo(Utilisateur u) {
        return new GroupeDTO.MembreInfo(
                u.getId(), u.getNom(), u.getPrenom(), u.getEmail(), u.getPhotoUrl(), u.getPoste(), u.getKeycloakId()
        );
    }
}