package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Stage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface StageRepository extends JpaRepository<Stage, Long> {

    List<Stage> findByUtilisateurId(Long utilisateurId);

    Optional<Stage> findFirstByUtilisateurIdOrderByCreatedAtDesc(
            Long utilisateurId);

    // ✅ Pas de String statut — utilise l'ID nomenclature (1 = EN_COURS)
    Optional<Stage> findFirstByUtilisateurIdAndStatutStageId(
            Long utilisateurId, Long statutStageId);

    // Trouver le stage actif (statutStageId = 1 = EN_COURS)
    default Optional<Stage> findStageActifByUtilisateur(Long userId) {
        return findFirstByUtilisateurIdAndStatutStageId(userId, 1L);
    }

    @Query("""
        SELECT DISTINCT s FROM Stage s
        JOIN s.utilisateur u
        JOIN u.superviseurLinks ss
        WHERE ss.superviseur.id = :superviseurId
        AND ss.actif = true
    """)
    List<Stage> findBySuperviseurId(@Param("superviseurId") Long superviseurId);
}