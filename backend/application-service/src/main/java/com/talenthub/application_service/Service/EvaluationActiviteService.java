// Service/EvaluationActiviteService.java — MISE À JOUR
package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.EvaluationResumeDTO;
import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Entity.EvaluationActivite;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.ActiviteRepository;
import com.talenthub.application_service.Repository.EvaluationActiviteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EvaluationActiviteService {

    private final EvaluationActiviteRepository evaluationRepo;
    private final ActiviteRepository           activiteRepo;

    @Transactional(readOnly = true)
    public List<EvaluationActivite> getByActivite(Long activiteId) {
        return evaluationRepo.findByActiviteId(activiteId);
    }

    @Transactional(readOnly = true)
    public Double getMoyenne(Long activiteId) {
        Double avg = evaluationRepo.getMoyenneNoteByActiviteId(activiteId);
        return avg != null ? Math.round(avg * 10) / 10.0 : null;
    }

    @Transactional(readOnly = true)
    public long countByActivite(Long activiteId) {
        return evaluationRepo.countByActiviteId(activiteId);
    }

    /**
     * ✅ NOUVEAU — Résumé (moyenne + total) de TOUTES les activités d'un
     * projet en une seule requête, pour la colonne "Évaluation" de la
     * table/kanban côté frontend.
     */
    @Transactional(readOnly = true)
    public List<EvaluationResumeDTO> getResumeByProjet(Long projetId) {
        return evaluationRepo.getResumeByProjetId(projetId).stream()
                .map(row -> new EvaluationResumeDTO(
                        (Long) row[0],
                        (Double) row[1],
                        ((Number) row[2]).longValue()))
                .toList();
    }

    /**
     * Upsert : si l'évaluateur a déjà noté cette activité, on met à jour sa
     * note/commentaire existant (contrainte unique activite+évaluateur).
     * Sinon, on crée une nouvelle évaluation.
     */
    @Transactional
    public EvaluationActivite evaluer(Long activiteId, String evaluateurKeycloakId,
                                      String evaluateurNom, Integer note, String commentaire) {
        if (note == null || note < 0 || note > 5) {
            throw new IllegalArgumentException("La note doit être comprise entre 0 et 5.");
        }

        Activité activite = activiteRepo.findById(activiteId)
                .orElseThrow(() -> new ResourceNotFoundException("Activité non trouvée: " + activiteId));

        EvaluationActivite eval = evaluationRepo
                .findByActiviteIdAndEvaluateurKeycloakId(activiteId, evaluateurKeycloakId)
                .orElseGet(() -> EvaluationActivite.builder()
                        .activite(activite)
                        .evaluateurKeycloakId(evaluateurKeycloakId)
                        .build());

        eval.setEvaluateurNom(evaluateurNom);
        eval.setNote(note);
        eval.setCommentaire(commentaire);

        EvaluationActivite saved = evaluationRepo.save(eval);
        log.info("⭐ Évaluation activité id={} par {} → note={}", activiteId, evaluateurKeycloakId, note);
        return saved;
    }

    /**
     * Supprime l'évaluation d'un évaluateur précis pour une activité précise.
     * Un évaluateur ne peut supprimer que SA PROPRE évaluation (vérifié au
     * niveau du contrôleur via le keycloakId du token, pas ici).
     */
    @Transactional
    public void supprimer(Long activiteId, String evaluateurKeycloakId) {
        evaluationRepo.deleteByActiviteIdAndEvaluateurKeycloakId(activiteId, evaluateurKeycloakId);
    }

    public static Map<String, Object> toResume(Double moyenne, long total) {
        return Map.of(
                "moyenne", moyenne != null ? moyenne : 0.0,
                "total", total
        );
    }
}