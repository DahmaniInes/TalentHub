// Repository/EvaluationActiviteRepository.java — MISE À JOUR
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.EvaluationActivite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EvaluationActiviteRepository extends JpaRepository<EvaluationActivite, Long> {

    // Toutes les évaluations d'une activité (un par évaluateur, vu la contrainte unique)
    List<EvaluationActivite> findByActiviteId(Long activiteId);

    // L'évaluation d'UN évaluateur précis pour UNE activité précise —
    // c'est cette requête qui permet l'upsert (créer si absent, sinon modifier).
    Optional<EvaluationActivite> findByActiviteIdAndEvaluateurKeycloakId(
            Long activiteId, String evaluateurKeycloakId);

    void deleteByActiviteIdAndEvaluateurKeycloakId(
            Long activiteId, String evaluateurKeycloakId);

    @Query("SELECT AVG(e.note) FROM EvaluationActivite e WHERE e.activite.id = :activiteId")
    Double getMoyenneNoteByActiviteId(@Param("activiteId") Long activiteId);

    long countByActiviteId(Long activiteId);

    void deleteByActiviteId(Long activiteId);

    /**
     * ✅ NOUVEAU — Résumé batch (moyenne + total) pour TOUTES les activités
     * d'un projet en une seule requête, utilisé par la colonne "Évaluation"
     * de la table/kanban (évite un appel N+1 par activité).
     * Retourne un tableau d'Object[] : [0]=activiteId, [1]=moyenne, [2]=total.
     */
    @Query("""
        SELECT e.activite.id, AVG(e.note), COUNT(e.id)
        FROM EvaluationActivite e
        WHERE e.activite.id IN (
            SELECT a.id FROM Activité a JOIN a.projets p WHERE p.id = :projetId
        )
        GROUP BY e.activite.id
    """)
    List<Object[]> getResumeByProjetId(@Param("projetId") Long projetId);
}