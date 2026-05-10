// src/main/java/com/talenthub/application_service/Controller/CommentaireController.java
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.CommentaireDTO;
import com.talenthub.application_service.Service.CommentaireService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/commentaires")
@RequiredArgsConstructor
public class CommentaireController {

    private final CommentaireService service;

    @GetMapping("/projet/{projetId}")
    public ResponseEntity<List<CommentaireDTO>> getByProjet(@PathVariable Long projetId) {
        return ResponseEntity.ok(
                service.getByProjet(projetId).stream().map(CommentaireDTO::new).toList());
    }

    @GetMapping("/activite/{activiteId}")
    public ResponseEntity<List<CommentaireDTO>> getByActivite(@PathVariable Long activiteId) {
        return ResponseEntity.ok(
                service.getByActivite(activiteId).stream().map(CommentaireDTO::new).toList());
    }

    @PostMapping("/projet/{projetId}")
    public ResponseEntity<CommentaireDTO> createForProjet(
            @PathVariable Long projetId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal Jwt jwt) {
        String kcId   = jwt != null ? jwt.getSubject() : "";
        String nom    = body.getOrDefault("auteurNom", "").toString();
        String photo  = body.containsKey("auteurPhotoUrl") ? body.get("auteurPhotoUrl").toString() : null;
        Long groupeId = body.containsKey("groupeId") && body.get("groupeId") != null
                ? Long.valueOf(body.get("groupeId").toString()) : null;
        return new ResponseEntity<>(
                new CommentaireDTO(service.createForProjet(projetId,
                        body.get("contenu").toString(), kcId, nom, photo, groupeId)),
                HttpStatus.CREATED);
    }

    @PostMapping("/activite/{activiteId}")
    public ResponseEntity<CommentaireDTO> createForActivite(
            @PathVariable Long activiteId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal Jwt jwt) {
        String kcId   = jwt != null ? jwt.getSubject() : "";
        String nom    = body.getOrDefault("auteurNom", "").toString();
        String photo  = body.containsKey("auteurPhotoUrl") ? body.get("auteurPhotoUrl").toString() : null;
        Long groupeId = body.containsKey("groupeId") && body.get("groupeId") != null
                ? Long.valueOf(body.get("groupeId").toString()) : null;
        return new ResponseEntity<>(
                new CommentaireDTO(service.createForActivite(activiteId,
                        body.get("contenu").toString(), kcId, nom, photo, groupeId)),
                HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CommentaireDTO> update(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal Jwt jwt) {
        String kcId = jwt != null ? jwt.getSubject() : "";
        return ResponseEntity.ok(
                new CommentaireDTO(service.update(id, body.get("contenu").toString(), kcId)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt) {
        String kcId = jwt != null ? jwt.getSubject() : "";
        service.delete(id, kcId);
        return ResponseEntity.noContent().build();
    }
}