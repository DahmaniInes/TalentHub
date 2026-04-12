package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Projet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProjetRepository extends JpaRepository<Projet, Long> {
    List<Projet> findByClientId(Long clientId);
    List<Projet> findByStatut(String statut);
    List<Projet> findByResponsableKeycloakId(String keycloakId);
    Optional<Projet> findByNumeroProjet(String numeroProjet);

    @Query("SELECT p FROM Projet p JOIN p.membres m WHERE m.utilisateur.id = :userId AND m.actif = true")
    List<Projet> findByMembreUtilisateurId(@Param("userId") Long userId);

    @Query("SELECT p FROM Projet p LEFT JOIN FETCH p.membres LEFT JOIN FETCH p.activites WHERE p.id = :id")
    Optional<Projet> findByIdWithDetails(@Param("id") Long id);
}