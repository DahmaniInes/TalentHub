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


    @Query("SELECT p FROM Projet p WHERE p.statutProjetId = :statutId")
    List<Projet> findByStatutProjetId(@Param("statutId") Long statutId);


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

    @Query("SELECT COUNT(p) FROM Projet p JOIN p.groupes g WHERE g.id = :groupeId AND p.statutProjetId = 2")
    int countProjetsActifsByGroupeId(@Param("groupeId") Long groupeId);

    @Query("SELECT p FROM Projet p JOIN p.groupes g WHERE g.id = :groupeId")
    List<Projet> findByGroupeId(@Param("groupeId") Long groupeId);



    // Ajouter dans ProjetRepository
    @Query("SELECT p FROM Projet p WHERE p.typeProjetId = :typeId")
    List<Projet> findByTypeProjetId(@Param("typeId") Long typeId);



    @Query("SELECT p.id FROM Projet p JOIN p.activites a WHERE a.id = :activiteId")
    List<Long> findProjetIdsByActiviteId(@Param("activiteId") Long activiteId);


}