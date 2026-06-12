package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.DocumentDTO;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import com.talenthub.application_service.Security.PermissionContext;
import com.talenthub.application_service.Service.DocumentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService        documentService;
    private final PermissionContext      permCtx;
    private final UtilisateurRepository  utilisateurRepo;

    @GetMapping("/projet/{projetId}")
    public ResponseEntity<List<DocumentDTO>> getByProjet(@PathVariable Long projetId) {
        return ResponseEntity.ok(documentService.getByProjet(projetId));
    }

    @GetMapping("/activite/{activiteId}")
    public ResponseEntity<List<DocumentDTO>> getByActivite(@PathVariable Long activiteId) {
        return ResponseEntity.ok(documentService.getByActivite(activiteId));
    }

    @GetMapping("/utilisateur/{userId}")
    public ResponseEntity<List<DocumentDTO>> getByUtilisateur(@PathVariable Long userId) {
        return ResponseEntity.ok(documentService.getByUtilisateur(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.getById(id));
    }

    /**
     * Upload multipart — corrigé :
     * On récupère l'utilisateurId depuis le keycloakId (subject du token JWT)
     * au lieu d'un claim custom qui n'existe pas toujours.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "projetId",       required = false) Long projetId,
            @RequestParam(value = "activiteId",     required = false) Long activiteId,
            @RequestParam(value = "stageId",        required = false) Long stageId,
            @RequestParam(value = "typeDocumentId", required = false) Long typeDocumentId,
            @RequestParam(value = "description",    required = false) String description,
            @RequestParam(value = "confidentiel",   defaultValue = "false") boolean confidentiel,
            @AuthenticationPrincipal Jwt jwt) {

        try {
            if (jwt == null)
                return ResponseEntity.status(401).body(Map.of("message", "Non authentifié"));

            // ✅ FIX : on résout l'utilisateur via son keycloakId (subject du JWT)
            String keycloakId = jwt.getSubject();
            Long utilisateurId = utilisateurRepo
                    .findByKeycloakId(keycloakId)
                    .map(u -> u.getId())
                    .orElse(null);

            if (utilisateurId == null) {
                log.warn("Utilisateur non trouvé pour keycloakId={}", keycloakId);
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "Utilisateur non trouvé pour ce token"));
            }

            DocumentDTO dto = documentService.upload(
                    file, utilisateurId, projetId, activiteId,
                    stageId, typeDocumentId, description, confidentiel);

            return new ResponseEntity<>(dto, HttpStatus.CREATED);

        } catch (Exception e) {
            log.error("Erreur upload document: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/hard")
    public ResponseEntity<Void> hardDelete(@PathVariable Long id) {
        if (!permCtx.has("DOCUMENT_DELETE_ALL"))
            return ResponseEntity.status(403).build();
        documentService.hardDelete(id);
        return ResponseEntity.noContent().build();
    }
}