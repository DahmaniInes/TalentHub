// src/main/java/com/talenthub/application_service/Repository/ProjetRepository.java
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Projet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjetRepository extends JpaRepository<Projet, Long> {

    List<Projet> findByClientId(Long clientId);
    List<Projet> findByStatut(String statut);

    @Query("SELECT DISTINCT p FROM Projet p JOIN p.membres m WHERE m.utilisateur.id = :userId")
    List<Projet> findByMembreUtilisateurId(@Param("userId") Long userId);

    // ✅ ULTRA-MINIMAL — NE charge que client + groupes (PAS g.membres)
    // g.membres est une collection imbriquée dans une autre collection → MultipleBagFetchException
    // Les membres de chaque groupe seront chargés via Hibernate lazy si nécessaire,
    // ou enrichis depuis GroupeRepository dans le service.
    @Query("""
        SELECT DISTINCT p FROM Projet p
        LEFT JOIN FETCH p.client
        LEFT JOIN FETCH p.groupes
        WHERE p.id = :id
        """)
    Optional<Projet> findByIdWithDetails(@Param("id") Long id);

    // Requête séparée pour les membres du projet (appelée manuellement si besoin)
    @Query("""
        SELECT DISTINCT p FROM Projet p
        LEFT JOIN FETCH p.membres m
        LEFT JOIN FETCH m.utilisateur
        WHERE p.id = :id
        """)
    Optional<Projet> findByIdWithMembres(@Param("id") Long id);

    @Query("SELECT MAX(p.numeroProjet) FROM Projet p WHERE p.numeroProjet LIKE 'PRJ-%'")
    String findMaxNumeroProjet();

    @Query("SELECT COUNT(p) FROM Projet p JOIN p.groupes g WHERE g.id = :groupeId AND p.statut = 'EN_COURS'")
    int countProjetsActifsByGroupeId(@Param("groupeId") Long groupeId);

    @Query("SELECT p FROM Projet p JOIN p.groupes g WHERE g.id = :groupeId")
    List<Projet> findByGroupeId(@Param("groupeId") Long groupeId);
}