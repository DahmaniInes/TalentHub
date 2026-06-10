package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.MembreEquipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface MembreEquipeRepository extends JpaRepository<MembreEquipe, Long> {

    List<MembreEquipe> findByProjetId(Long projetId);
    List<MembreEquipe> findByUtilisateurId(Long utilisateurId);

    Optional<MembreEquipe> findByProjetIdAndUtilisateurId(Long projetId, Long utilisateurId);
    boolean existsByProjetIdAndUtilisateurId(Long projetId, Long utilisateurId);

    // ✅ NOUVEAU — stagiaires d'un projet
    @Query("SELECT m FROM MembreEquipe m WHERE m.projet.id = :projetId AND m.stage IS NOT NULL")
    List<MembreEquipe> findStagiairesByProjetId(@Param("projetId") Long projetId);

    // ✅ NOUVEAU — projets d'un stagiaire via son stage
    @Query("SELECT m FROM MembreEquipe m WHERE m.stage.id = :stageId")
    List<MembreEquipe> findByStageId(@Param("stageId") Long stageId);

    @Modifying
    @Query("DELETE FROM MembreEquipe m WHERE m.projet.id = :projetId")
    int deleteByProjetId(@Param("projetId") Long projetId);
}