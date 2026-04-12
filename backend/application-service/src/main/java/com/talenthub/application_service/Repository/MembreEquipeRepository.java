package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.MembreEquipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MembreEquipeRepository extends JpaRepository<MembreEquipe, Long> {
    List<MembreEquipe> findByProjetId(Long projetId);
    List<MembreEquipe> findByUtilisateurId(Long utilisateurId);
    List<MembreEquipe> findByProjetIdAndActifTrue(Long projetId);
    Optional<MembreEquipe> findByProjetIdAndUtilisateurId(Long projetId, Long utilisateurId);
    boolean existsByProjetIdAndUtilisateurId(Long projetId, Long utilisateurId);
    void deleteByProjetIdAndUtilisateurId(Long projetId, Long utilisateurId);
}