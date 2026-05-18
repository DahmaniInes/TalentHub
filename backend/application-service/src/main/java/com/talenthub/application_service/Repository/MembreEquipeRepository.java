// Repository/MembreEquipeRepository.java — avec méthode delete par projetId
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.MembreEquipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MembreEquipeRepository extends JpaRepository<MembreEquipe, Long> {

    List<MembreEquipe> findByProjetIdAndActifTrue(Long projetId);

    List<MembreEquipe> findByUtilisateurId(Long userId);

    boolean existsByProjetIdAndUtilisateurId(Long projetId, Long utilisateurId);

    Optional<MembreEquipe> findByProjetIdAndUtilisateurId(Long projetId, Long utilisateurId);

    // ✅ Supprimer tous les membres d'un projet avant de supprimer le projet
    @Modifying
    @Query("DELETE FROM MembreEquipe m WHERE m.projet.id = :projetId")
    int deleteByProjetId(@Param("projetId") Long projetId);
}