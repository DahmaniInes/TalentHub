// Controller/UtilisateurController.java — COMPLET avec @RequiresPermission + PermissionContext
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.UserCreationRequest;
import com.talenthub.application_service.DTO.UtilisateurResponseDTO;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Security.RequiresPermission;
import com.talenthub.application_service.Security.PermissionContext;
import com.talenthub.application_service.Service.UtilisateurService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/utilisateurs")
public class UtilisateurController {

    private final UtilisateurService utilisateurService;
    private final PermissionContext  permCtx;

    public UtilisateurController(UtilisateurService utilisateurService,
                                 PermissionContext permCtx) {
        this.utilisateurService = utilisateurService;
        this.permCtx            = permCtx;
    }

    // ── Création utilisateur — USER_CREATE ────────────────────────────────
    @RequiresPermission("USER_CREATE")
    @PostMapping
    public ResponseEntity<UtilisateurResponseDTO> createUtilisateur(
            @Valid @RequestBody UserCreationRequest request) {
        Utilisateur created = utilisateurService.createUserByAdmin(request);
        return new ResponseEntity<>(new UtilisateurResponseDTO(created), HttpStatus.CREATED);
    }

    // ── Tous les utilisateurs — USER_VIEW ─────────────────────────────────
    @RequiresPermission("USER_VIEW")
    @GetMapping
    public ResponseEntity<List<UtilisateurResponseDTO>> getAllUtilisateurs() {
        return ResponseEntity.ok(
                utilisateurService.getAllUtilisateurs().stream()
                        .map(UtilisateurResponseDTO::new).toList()
        );
    }

    // ── Par ID — USER_VIEW ────────────────────────────────────────────────
    @RequiresPermission("USER_VIEW")
    @GetMapping("/{id}")
    public ResponseEntity<UtilisateurResponseDTO> getUtilisateurById(@PathVariable Long id) {
        return ResponseEntity.ok(
                new UtilisateurResponseDTO(utilisateurService.getUtilisateurById(id))
        );
    }

    // ── Par Keycloak ID — pas de guard (profil personnel de chaque user) ──
    @GetMapping("/keycloak/{keycloakId}")
    public ResponseEntity<UtilisateurResponseDTO> getUtilisateurByKeycloakId(
            @PathVariable String keycloakId) {
        return ResponseEntity.ok(
                new UtilisateurResponseDTO(utilisateurService.getUtilisateurByKeycloakId(keycloakId))
        );
    }

    // ── Mise à jour TEXTE profil personnel — pas de guard strict ──────────
    @PatchMapping(
            value = "/keycloak/{keycloakId}/profile",
            consumes = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<UtilisateurResponseDTO> updateProfileJson(
            @PathVariable String keycloakId,
            @RequestBody Map<String, Object> updates) throws IOException {
        Utilisateur updated = utilisateurService.updateUserProfile(keycloakId, updates, null);
        return ResponseEntity.ok(new UtilisateurResponseDTO(updated));
    }

    // ── Upload photo — pas de guard ───────────────────────────────────────
    @PatchMapping(
            value = "/keycloak/{keycloakId}/profile",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<UtilisateurResponseDTO> updateProfilePhoto(
            @PathVariable String keycloakId,
            @RequestPart(value = "photo", required = false) MultipartFile photo,
            @RequestPart(value = "data",  required = false) String jsonData) throws IOException {
        Map<String, Object> updates = Map.of();
        if (jsonData != null && !jsonData.isBlank()) {
            try {
                updates = new com.fasterxml.jackson.databind.ObjectMapper()
                        .readValue(jsonData, Map.class);
            } catch (Exception ignored) {}
        }
        Utilisateur updated = utilisateurService.updateUserProfile(keycloakId, updates, photo);
        return ResponseEntity.ok(new UtilisateurResponseDTO(updated));
    }

    // ── Admin mise à jour complète — USER_UPDATE_INFO ─────────────────────
    @RequiresPermission("USER_UPDATE_INFO")
    @PutMapping("/{id}")
    public ResponseEntity<UtilisateurResponseDTO> updateUtilisateur(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(
                new UtilisateurResponseDTO(utilisateurService.updateByAdmin(id, body))
        );
    }

    // ── Toggle actif/inactif — USER_SECURE_TOGGLE ─────────────────────────
    @RequiresPermission("USER_SECURE_TOGGLE")
    @PatchMapping("/{id}/toggle-actif")
    public ResponseEntity<UtilisateurResponseDTO> toggleActif(@PathVariable Long id) {
        return ResponseEntity.ok(
                new UtilisateurResponseDTO(utilisateurService.toggleActif(id))
        );
    }

    // ── Reset password — USER_SECURE_PWD ──────────────────────────────────
    @RequiresPermission("USER_SECURE_PWD")
    @PatchMapping("/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(@PathVariable Long id) {
        utilisateurService.resetPassword(id);
        return ResponseEntity.noContent().build();
    }

    // ── Supprimer — USER_DELETE ────────────────────────────────────────────
    @RequiresPermission("USER_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUtilisateur(@PathVariable Long id) {
        utilisateurService.deleteUtilisateur(id);
        return ResponseEntity.noContent().build();
    }

    // ── Sync profilIds Keycloak — USER_UPDATE_INFO ────────────────────────
    @RequiresPermission("USER_UPDATE_INFO")
    @PostMapping("/sync-keycloak-profil-ids")
    public ResponseEntity<Map<String, Object>> syncProfilIds() {
        Map<String, Object> result = utilisateurService.syncAllProfilIdsToKeycloak();
        return ResponseEntity.ok(result);
    }



    // ── Modifier photo (admin) — USER_UPDATE_INFO ──────────────────────────
    @RequiresPermission("USER_UPDATE_INFO")
    @PatchMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UtilisateurResponseDTO> updateUserPhotoByAdmin(
            @PathVariable Long id,
            @RequestPart("photo") MultipartFile photo) throws IOException {
        Utilisateur updated = utilisateurService.updatePhotoByAdmin(id, photo);
        return ResponseEntity.ok(new UtilisateurResponseDTO(updated));
    }
}