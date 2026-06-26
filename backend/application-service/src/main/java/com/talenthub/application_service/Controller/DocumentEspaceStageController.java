// Controller/DocumentEspaceStageController.java — NOUVEAU
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.DocumentEspaceStageDTO;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import com.talenthub.application_service.Security.PermissionContext;
import com.talenthub.application_service.Service.DocumentEspaceStageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * ✅ NOUVEAU — Contrôleur dédié pour la page "Documents" de l'espace stage.
 * Volontairement isolé de DocumentController (qui gère l'upload/suppression
 * générique projet/activité) : cette page est purement une vue de
 * CONSULTATION agrégée, avec sa propre logique d'accès à deux niveaux.
 *
 * Accès : nécessite INT_DOC_VIEW dans tous les cas. Le niveau de détail
 * (vue large vs vue restreinte) est déterminé par la présence ou non de
 * INT_ADMIN_VIEW_ALL_INTERNS / INT_PROJ_VIEW_ALL — voir DocumentEspaceStageService.
 */
@Slf4j
@RestController
@RequestMapping("/documents-espace-stage")
@RequiredArgsConstructor
public class DocumentEspaceStageController {

    private final DocumentEspaceStageService documentEspaceStageService;
    private final PermissionContext          permCtx;
    private final UtilisateurRepository      utilisateurRepo;

    @GetMapping
    public ResponseEntity<?> getDocuments(@AuthenticationPrincipal Jwt jwt) {
        if (!permCtx.has("INT_DOC_VIEW")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission INT_DOC_VIEW requise."));
        }

        if (jwt == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Non authentifié."));
        }

        String keycloakId = jwt.getSubject();
        Long utilisateurId = utilisateurRepo.findByKeycloakId(keycloakId)
                .map(u -> u.getId())
                .orElse(null);

        if (utilisateurId == null) {
            log.warn("Utilisateur non trouvé pour keycloakId={}", keycloakId);
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Utilisateur non trouvé pour ce token."));
        }

        boolean accesLarge = permCtx.has("INT_ADMIN_VIEW_ALL_INTERNS")
                || permCtx.has("INT_PROJ_VIEW_ALL");

        try {
            List<DocumentEspaceStageDTO> documents =
                    documentEspaceStageService.getDocumentsVisibles(utilisateurId, accesLarge);
            return ResponseEntity.ok(documents);
        } catch (Exception e) {
            log.error("Erreur GET /documents-espace-stage: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", e.getMessage()));
        }
    }
}