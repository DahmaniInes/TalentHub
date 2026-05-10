// ActiviteRepository.java — REMPLACE COMPLET
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Activité;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ActiviteRepository extends JpaRepository<Activité, Long> {

    // ✅ Activités d'un projet via la table de jointure projet_activites
    @Query("""
        SELECT a FROM Activité a
        LEFT JOIN FETCH a.groupes
        LEFT JOIN FETCH a.utilisateur
        WHERE EXISTS (
            SELECT p FROM a.projets p WHERE p.id = :projetId
        )
        ORDER BY a.dateCreation DESC
        """)
    List<Activité> findByProjetId(@Param("projetId") Long projetId);

    @Query("SELECT a FROM Activité a WHERE a.utilisateur.id = :userId")
    List<Activité> findByUtilisateurId(@Param("userId") Long userId);

    // ✅ Requête filtrée — plus de référence à a.projet.id
    @Query("""
        SELECT DISTINCT a FROM Activité a
        LEFT JOIN FETCH a.groupes
        LEFT JOIN FETCH a.utilisateur
        WHERE (:statutId      IS NULL OR a.statutActiviteId = :statutId)
          AND (:utilisateurId IS NULL OR a.utilisateur.id  = :utilisateurId)
          AND (:priorite      IS NULL OR a.priorite        = :priorite)
          AND (:globales = false OR a.estGlobale = true)
        ORDER BY a.dateCreation DESC
        """)
    List<Activité> findAllFiltered(
            @Param("statutId")      Long    statutId,
            @Param("utilisateurId") Long    utilisateurId,
            @Param("priorite")      Integer priorite,
            @Param("globales")      boolean globalesUniquement
    );

    // ✅ Activités globales uniquement
    @Query("""
        SELECT a FROM Activité a
        LEFT JOIN FETCH a.groupes
        LEFT JOIN FETCH a.utilisateur
        WHERE a.estGlobale = true
        ORDER BY a.dateCreation DESC
        """)
    List<Activité> findGlobales();

    // Compter les activités d'un projet
    @Query("SELECT COUNT(a) FROM Activité a JOIN a.projets p WHERE p.id = :projetId")
    long countByProjetId(@Param("projetId") Long projetId);
}