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

    // ✅ Via la table StagiaireSuperviseur (plus de ManyToMany brut)
    @Query("""
        SELECT u FROM Utilisateur u
        JOIN u.superviseurLinks ss
        WHERE ss.superviseur.id = :superviseurId
        AND ss.actif = true
    """)
    List<Utilisateur> findStagiairesBySuperviseurId(@Param("superviseurId") Long superviseurId);

    // Stagiaires = profil contenant "stagiaire" (détection via profil)
    @Query("""
        SELECT u FROM Utilisateur u
        WHERE u.profil IS NOT NULL
        AND LOWER(u.profil.nom) LIKE '%stagiaire%'
    """)
    List<Utilisateur> findAllStagiaires();
}