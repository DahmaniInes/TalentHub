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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/utilisateurs")
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    public UtilisateurController(UtilisateurService utilisateurService) {
        this.utilisateurService = utilisateurService;
    }

    @PostMapping
    public ResponseEntity<UtilisateurResponseDTO> createUtilisateur(
            @Valid @RequestBody UserCreationRequest request) {
        Utilisateur created = utilisateurService.createUserByAdmin(request);
        return new ResponseEntity<>(new UtilisateurResponseDTO(created), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<UtilisateurResponseDTO>> getAllUtilisateurs() {
        List<UtilisateurResponseDTO> dtos = utilisateurService.getAllUtilisateurs()
                .stream()
                .map(UtilisateurResponseDTO::new)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UtilisateurResponseDTO> getUtilisateurById(@PathVariable Long id) {
        return ResponseEntity.ok(
                new UtilisateurResponseDTO(utilisateurService.getUtilisateurById(id))
        );
    }

    @GetMapping("/keycloak/{keycloakId}")
    public ResponseEntity<UtilisateurResponseDTO> getUtilisateurByKeycloakId(
            @PathVariable String keycloakId) {
        return ResponseEntity.ok(
                new UtilisateurResponseDTO(utilisateurService.getUtilisateurByKeycloakId(keycloakId))
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUtilisateur(@PathVariable Long id) {
        utilisateurService.deleteUtilisateur(id);
        return ResponseEntity.noContent().build();
    }


    // ====================== NOUVELLE MÉTHODE ======================
    @PatchMapping(value = "/keycloak/{keycloakId}/profile",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UtilisateurResponseDTO> updateProfile(
            @PathVariable String keycloakId,
            @RequestPart(value = "updates", required = false) Map<String, Object> updates,   // champs texte
            @RequestPart(value = "photo", required = false) MultipartFile photo) {         // fichier photo

        try {
            Utilisateur updated = utilisateurService.updateUserProfile(keycloakId, updates, photo);
            return ResponseEntity.ok(new UtilisateurResponseDTO(updated));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}