package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.UserCreationRequest;
import com.talenthub.application_service.DTO.UtilisateurResponseDTO;
import com.talenthub.application_service.Entity.Utilisateur;
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

    public UtilisateurController(UtilisateurService utilisateurService) {
        this.utilisateurService = utilisateurService;
    }

    // ── Création utilisateur (admin) ───────────────────────────────────────
    @PostMapping
    public ResponseEntity<UtilisateurResponseDTO> createUtilisateur(
            @Valid @RequestBody UserCreationRequest request) {
        Utilisateur created = utilisateurService.createUserByAdmin(request);
        return new ResponseEntity<>(new UtilisateurResponseDTO(created), HttpStatus.CREATED);
    }

    // ── Tous les utilisateurs ──────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<UtilisateurResponseDTO>> getAllUtilisateurs() {
        return ResponseEntity.ok(
                utilisateurService.getAllUtilisateurs().stream()
                        .map(UtilisateurResponseDTO::new).toList()
        );
    }

    // ── Par ID ────────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<UtilisateurResponseDTO> getUtilisateurById(@PathVariable Long id) {
        return ResponseEntity.ok(new UtilisateurResponseDTO(utilisateurService.getUtilisateurById(id)));
    }

    // ── Par Keycloak ID ───────────────────────────────────────────────────
    @GetMapping("/keycloak/{keycloakId}")
    public ResponseEntity<UtilisateurResponseDTO> getUtilisateurByKeycloakId(
            @PathVariable String keycloakId) {
        return ResponseEntity.ok(
                new UtilisateurResponseDTO(utilisateurService.getUtilisateurByKeycloakId(keycloakId))
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // ✅ CAS 1 : Mise à jour TEXTE uniquement (application/json)
    //    Appelé quand on modifie nom, téléphone, adresse, etc.
    // ─────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────
    // ✅ CAS 2 : Upload photo (multipart/form-data)
    //    Appelé quand on change la photo de profil
    //    Front envoie : FormData avec champ "photo"
    // ─────────────────────────────────────────────────────────────────────
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
                updates = new com.fasterxml.jackson.databind.ObjectMapper().readValue(jsonData, Map.class);
            } catch (Exception ignored) {}
        }

        Utilisateur updated = utilisateurService.updateUserProfile(keycloakId, updates, photo);
        return ResponseEntity.ok(new UtilisateurResponseDTO(updated));
    }

    // ── Admin : mise à jour complète ───────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<UtilisateurResponseDTO> updateUtilisateur(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(new UtilisateurResponseDTO(utilisateurService.updateByAdmin(id, body)));
    }

    // ── Toggle actif/inactif ───────────────────────────────────────────────
    @PatchMapping("/{id}/toggle-actif")
    public ResponseEntity<UtilisateurResponseDTO> toggleActif(@PathVariable Long id) {
        return ResponseEntity.ok(new UtilisateurResponseDTO(utilisateurService.toggleActif(id)));
    }

    // ── Reset password ─────────────────────────────────────────────────────
    @PatchMapping("/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(@PathVariable Long id) {
        utilisateurService.resetPassword(id);
        return ResponseEntity.noContent().build();
    }

    // ── Supprimer ──────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUtilisateur(@PathVariable Long id) {
        utilisateurService.deleteUtilisateur(id);
        return ResponseEntity.noContent().build();
    }
}