// Controller/EvaluationActiviteController.java — MISE À JOUR
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.EvaluationActiviteDTO;
import com.talenthub.application_service.DTO.EvaluationResumeDTO;
import com.talenthub.application_service.Entity.EvaluationActivite;
import com.talenthub.application_service.Security.PermissionContext;
import com.talenthub.application_service.Service.EvaluationActiviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class EvaluationActiviteController {

    private final EvaluationActiviteService evaluationService;
    private final PermissionContext         permCtx;

    /**
     * ✅ Lecture : accessible à toute personne ayant déjà accès à l'activité
     * (pas de restriction supplémentaire ici) — la page projet-stage-detail
     * gère déjà l'accès en amont. On affiche la liste des évaluations +
     * la moyenne, peu importe qui regarde.
     */
    @GetMapping("/activites/{activiteId}/evaluations")
    public ResponseEntity<?> getByActivite(@PathVariable Long activiteId) {
        List<EvaluationActiviteDTO> evaluations = evaluationService.getByActivite(activiteId)
                .stream().map(EvaluationActiviteDTO::new).toList();
        Double moyenne = evaluationService.getMoyenne(activiteId);
        long total = evaluationService.countByActivite(activiteId);

        return ResponseEntity.ok(Map.of(
                "evaluations", evaluations,
                "moyenne", moyenne != null ? moyenne : 0.0,
                "total", total
        ));
    }

    /**
     * ✅ NOUVEAU — Résumé batch (moyenne + total) pour TOUTES les activités
     * d'un projet en un seul appel, utilisé par la colonne "Évaluation" de
     * la table/kanban dans projet-stage-detail. Lecture libre, comme
     * getByActivite() ci-dessus.
     */
    @GetMapping("/activites/projet/{projetId}/evaluations-resume")
    public ResponseEntity<List<EvaluationResumeDTO>> getResumeByProjet(@PathVariable Long projetId) {
        return ResponseEntity.ok(evaluationService.getResumeByProjet(projetId));
    }

    /**
     * ✅ Création/modification (upsert) — réservée STRICTEMENT aux personnes
     * ayant À LA FOIS INT_SUPER_EVALUATE ET INT_SUPER_CAN_SUPERVISE.
     * Les deux permissions sont vérifiées ensemble, pas en OU.
     */
    @PostMapping("/activites/{activiteId}/evaluations")
    public ResponseEntity<?> evaluer(@PathVariable Long activiteId,
                                     @RequestBody Map<String, Object> body,
                                     @AuthenticationPrincipal Jwt jwt) {
        if (!permCtx.has("INT_SUPER_EVALUATE") || !permCtx.has("INT_SUPER_CAN_SUPERVISE")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message",
                            "Permissions INT_SUPER_EVALUATE et INT_SUPER_CAN_SUPERVISE requises."));
        }

        String kcId = jwt != null ? jwt.getSubject() : null;
        if (kcId == null || kcId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "Utilisateur non authentifié."));
        }

        Integer note = body.get("note") != null
                ? Integer.valueOf(body.get("note").toString()) : null;
        String commentaire = body.get("commentaire") != null
                ? body.get("commentaire").toString() : null;
        String evaluateurNom = body.get("evaluateurNom") != null
                ? body.get("evaluateurNom").toString() : "";

        try {
            EvaluationActivite saved = evaluationService.evaluer(
                    activiteId, kcId, evaluateurNom, note, commentaire);
            return new ResponseEntity<>(new EvaluationActiviteDTO(saved), HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * ✅ Suppression — un évaluateur ne peut supprimer que SA PROPRE évaluation.
     * Mêmes permissions requises que pour évaluer.
     */
    @DeleteMapping("/activites/{activiteId}/evaluations")
    public ResponseEntity<Void> supprimer(@PathVariable Long activiteId,
                                          @AuthenticationPrincipal Jwt jwt) {
        if (!permCtx.has("INT_SUPER_EVALUATE") || !permCtx.has("INT_SUPER_CAN_SUPERVISE")) {
            return ResponseEntity.status(403).build();
        }
        String kcId = jwt != null ? jwt.getSubject() : null;
        if (kcId == null) return ResponseEntity.status(401).build();

        evaluationService.supprimer(activiteId, kcId);
        return ResponseEntity.noContent().build();
    }
}