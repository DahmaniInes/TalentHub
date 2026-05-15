// application-service/.../Controller/ReclamationController.java
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ReclamationDTO;
import com.talenthub.application_service.DTO.ReclamationRequest;
import com.talenthub.application_service.Service.CloudinaryService;
import com.talenthub.application_service.Service.ReclamationService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.talenthub.application_service.Security.PermissionContext;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reclamations")
public class ReclamationController {

    private final ReclamationService service;
    private final PermissionContext  permCtx;
    private final CloudinaryService  cloudinary;

    public ReclamationController(ReclamationService service,
                                 PermissionContext permCtx,
                                 CloudinaryService cloudinary) {
        this.service    = service;
        this.permCtx    = permCtx;
        this.cloudinary = cloudinary;
    }

    /** GET /reclamations — RECLAMATION_VIEW_ALL = toutes, sinon propres réclamations */
    @GetMapping
    public ResponseEntity<List<ReclamationDTO>> getAll(@AuthenticationPrincipal Jwt jwt) {
        if (permCtx.has("RECLAMATION_VIEW_ALL")) {
            return ResponseEntity.ok(service.getAll().stream().map(ReclamationDTO::new).toList());
        }
        String keycloakId = jwt != null ? jwt.getSubject() : null;
        if (keycloakId == null) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(service.getByKeycloakId(keycloakId).stream()
                .map(ReclamationDTO::new).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReclamationDTO> getById(@PathVariable Long id) {
        return service.getById(id)
                .map(r -> ResponseEntity.ok(new ReclamationDTO(r)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/utilisateur/{utilisateurId}")
    public ResponseEntity<List<ReclamationDTO>> getByUtilisateur(@PathVariable Long utilisateurId) {
        return ResponseEntity.ok(service.getByUtilisateur(utilisateurId).stream()
                .map(ReclamationDTO::new).toList());
    }

    /** POST /reclamations — RECLAMATION_CREATE */
    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody ReclamationRequest req) {
        if (!permCtx.has("RECLAMATION_CREATE"))
            return ResponseEntity.status(403).body(Map.of("message", "Permission RECLAMATION_CREATE requise."));
        return new ResponseEntity<>(new ReclamationDTO(service.create(req)), HttpStatus.CREATED);
    }

    /** POST /reclamations/upload — upload document vers Cloudinary */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(@RequestParam("file") MultipartFile file) {
        if (!permCtx.has("RECLAMATION_CREATE") && !permCtx.has("RECLAMATION_UPDATE_OWN")
                && !permCtx.has("RECLAMATION_UPDATE_ALL"))
            return ResponseEntity.status(403).body(Map.of("message", "Permission insuffisante."));
        try {
            String url = cloudinary.uploadImage(file, "talenthub/reclamations");
            return ResponseEntity.ok(Map.of("url", url));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("message", "Erreur upload: " + e.getMessage()));
        }
    }

    /** PUT /reclamations/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @Valid @RequestBody ReclamationRequest req,
                                    @AuthenticationPrincipal Jwt jwt) {
        if (!permCtx.has("RECLAMATION_UPDATE_ALL") && !permCtx.has("RECLAMATION_UPDATE_OWN"))
            return ResponseEntity.status(403).body(Map.of("message", "Permission insuffisante."));
        if (!permCtx.has("RECLAMATION_UPDATE_ALL") && permCtx.has("RECLAMATION_UPDATE_OWN")) {
            boolean isOwner = service.isOwner(id, jwt != null ? jwt.getSubject() : "");
            if (!isOwner) return ResponseEntity.status(403)
                    .body(Map.of("message", "Vous ne pouvez modifier que vos propres réclamations."));
        }
        return ResponseEntity.ok(new ReclamationDTO(service.update(id, req)));
    }

    /** POST /reclamations/{id}/traiter — RECLAMATION_TREAT */
    @PostMapping("/{id}/traiter")
    public ResponseEntity<?> traiter(@PathVariable Long id,
                                     @RequestBody Map<String, String> body,
                                     @AuthenticationPrincipal Jwt jwt) {
        if (!permCtx.has("RECLAMATION_TREAT"))
            return ResponseEntity.status(403).body(Map.of("message", "Permission RECLAMATION_TREAT requise."));
        Long statutId      = Long.parseLong(body.get("statutId"));
        String commentaire = body.get("commentaire");
        String statutCode  = body.getOrDefault("statutCode", "");
        String traitePar   = jwt != null ? jwt.getSubject() : "";
        return ResponseEntity.ok(new ReclamationDTO(service.traiter(id, statutId, traitePar, commentaire, statutCode)));
    }

    /** POST /reclamations/{id}/commentaires — RECLAMATION_COMMENT */
    @PostMapping("/{id}/commentaires")
    public ResponseEntity<?> ajouterCommentaire(@PathVariable Long id,
                                                @RequestBody Map<String, Object> body,
                                                @AuthenticationPrincipal Jwt jwt) {
        if (!permCtx.has("RECLAMATION_COMMENT") && !permCtx.has("RECLAMATION_TREAT")
                && !permCtx.has("RECLAMATION_VIEW_OWN"))
            return ResponseEntity.status(403).body(Map.of("message", "Permission insuffisante."));
        String contenu    = (String) body.get("contenu");
        String auteurNom  = (String) body.getOrDefault("auteurNom", "");
        boolean estAdmin  = Boolean.TRUE.equals(body.get("estAdmin"));
        String auteurKcId = jwt != null ? jwt.getSubject() : "";
        return ResponseEntity.ok(new ReclamationDTO(
                service.ajouterCommentaire(id, contenu, auteurKcId, auteurNom, estAdmin)));
    }

    /** DELETE /reclamations/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                    @AuthenticationPrincipal Jwt jwt) {
        if (!permCtx.has("RECLAMATION_DELETE_ALL") && !permCtx.has("RECLAMATION_DELETE_OWN"))
            return ResponseEntity.status(403).body(Map.of("message", "Permission insuffisante."));
        if (!permCtx.has("RECLAMATION_DELETE_ALL") && permCtx.has("RECLAMATION_DELETE_OWN")) {
            boolean isOwner = service.isOwner(id, jwt != null ? jwt.getSubject() : "");
            if (!isOwner) return ResponseEntity.status(403)
                    .body(Map.of("message", "Vous ne pouvez supprimer que vos propres réclamations."));
        }
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}