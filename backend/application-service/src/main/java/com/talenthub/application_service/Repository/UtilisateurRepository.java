package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {

    Optional<Utilisateur> findByKeycloakId(String keycloakId);
    boolean existsByEmail(String email);

    // ✅ Supprimer findByEstStagiaireTrue() — le champ n'existe plus

    // ✅ Corriger la query — on détecte les stagiaires via la relation superviseurs
    // Un stagiaire = un utilisateur qui a au moins un superviseur dans sa liste
    @Query("SELECT u FROM Utilisateur u JOIN u.superviseurs sup WHERE sup.id = :superviseurId")
    List<Utilisateur> findStagiairesBySuperviseurId(@Param("superviseurId") Long superviseurId);
}