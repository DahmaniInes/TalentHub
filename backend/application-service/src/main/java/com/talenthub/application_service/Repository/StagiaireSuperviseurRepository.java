package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.StagiaireSuperviseur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface StagiaireSuperviseurRepository
        extends JpaRepository<StagiaireSuperviseur, Long> {

    // Superviseurs d'un stagiaire (actifs)
    List<StagiaireSuperviseur> findByStagiaireIdAndActifTrue(Long stagiaireId);

    // Tous les superviseurs d'un stagiaire (historique complet)
    List<StagiaireSuperviseur> findByStagiaireId(Long stagiaireId);

    // Stagiaires d'un superviseur (actifs)
    List<StagiaireSuperviseur> findBySuperviseurIdAndActifTrue(Long superviseurId);

    // Stagiaires d'un superviseur pour un stage précis
    List<StagiaireSuperviseur> findBySuperviseurIdAndStageId(Long superviseurId, Long stageId);

    // Supprimer le lien entre un stagiaire et un superviseur
    void deleteByStagiaireIdAndSuperviseurId(Long stagiaireId, Long superviseurId);

    // Vérifier si le lien existe
    boolean existsByStagiaireIdAndSuperviseurIdAndActifTrue(Long stagiaireId, Long superviseurId);

    @Query("""
        SELECT ss FROM StagiaireSuperviseur ss
        WHERE ss.stagiaire.id = :stagiaireId
        AND ss.superviseur.id = :superviseurId
    """)
    java.util.Optional<StagiaireSuperviseur> findByStagiaireIdAndSuperviseurId(
            @Param("stagiaireId") Long stagiaireId,
            @Param("superviseurId") Long superviseurId);
}