// src/main/java/com/talenthub/application_service/Repository/ActiviteRepository.java
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Activité;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ActiviteRepository extends JpaRepository<Activité, Long> {

    List<Activité> findByProjetIdOrderByNumeroActivite(Long projetId);

    List<Activité> findByProjetIdAndStatutActiviteId(Long projetId, Long statutId);

    List<Activité> findByUtilisateurId(Long userId);

    long countByProjetId(Long projetId);

    // ✅ NOUVEAU — Requête filtrée avec tous les filtres optionnels
    // Supporte : projetId, statutId, utilisateurId, priorite, globalesUniquement
    @Query("""
        SELECT a FROM Activité a
        LEFT JOIN FETCH a.projet p
        LEFT JOIN FETCH a.utilisateur u
        WHERE (:projetId      IS NULL OR a.projet.id          = :projetId)
          AND (:statutId      IS NULL OR a.statutActiviteId   = :statutId)
          AND (:utilisateurId IS NULL OR a.utilisateur.id     = :utilisateurId)
          AND (:priorite      IS NULL OR a.priorite           = :priorite)
          AND (:globales = false
               OR a.projet IS NULL
               OR p.autoriserActivitesGlobales = true)
        ORDER BY a.dateCreation DESC
        """)
    List<Activité> findAllFiltered(
            @Param("projetId")      Long    projetId,
            @Param("statutId")      Long    statutId,
            @Param("utilisateurId") Long    utilisateurId,
            @Param("priorite")      Integer priorite,
            @Param("globales")      boolean globalesUniquement
    );

    // ✅ NOUVEAU — Activités sans projet (globales pures)
    @Query("""
        SELECT a FROM Activité a
        LEFT JOIN FETCH a.utilisateur
        WHERE a.projet IS NULL
        ORDER BY a.dateCreation DESC
        """)
    List<Activité> findGlobales();
}