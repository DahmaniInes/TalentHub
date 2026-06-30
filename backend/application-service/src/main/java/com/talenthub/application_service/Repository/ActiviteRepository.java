// ActiviteRepository.java — REMPLACE COMPLET
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Activité;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ActiviteRepository extends JpaRepository<Activité, Long> {

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

    @Query("""
        SELECT DISTINCT a FROM Activité a
        LEFT JOIN FETCH a.groupes
        LEFT JOIN FETCH a.utilisateur
        WHERE (:statutId   IS NULL OR a.statutActiviteId = :statutId)
          AND (:utilisateurId IS NULL OR a.utilisateur.id = :utilisateurId)
          AND (:prioriteId IS NULL OR a.prioriteId = :prioriteId)
          AND (:globales = false OR a.estGlobale = true)
        ORDER BY a.dateCreation DESC
        """)
    List<Activité> findAllFiltered(
            @Param("statutId")      Long    statutId,
            @Param("utilisateurId") Long    utilisateurId,
            @Param("prioriteId")    Long    prioriteId,
            @Param("globales")      boolean globalesUniquement
    );

    @Query("""
        SELECT a FROM Activité a
        LEFT JOIN FETCH a.groupes
        LEFT JOIN FETCH a.utilisateur
        WHERE a.estGlobale = true
        ORDER BY a.dateCreation DESC
        """)
    List<Activité> findGlobales();

    @Query("SELECT COUNT(a) FROM Activité a JOIN a.projets p WHERE p.id = :projetId")
    long countByProjetId(@Param("projetId") Long projetId);

    @Query("""
        SELECT a FROM Activité a
        JOIN a.projets p
        WHERE a.activiteSourceGlobaleId = :sourceGlobaleId
        AND p.id = :projetId
        """)
    Optional<Activité> findBySourceGlobaleIdAndProjetId(
            @Param("sourceGlobaleId") Long sourceGlobaleId,
            @Param("projetId") Long projetId
    );

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Activités ASSIGNÉES à un utilisateur donné, restreintes
    // à un ensemble de projets précis. Utilisée par le nettoyage des
    // assignations lors du retrait d'un membre de groupe (on a besoin de
    // savoir, pour CE user et CE(S) projet(s) précis, quelles activités il
    // a comme assignation).
    // ════════════════════════════════════════════════════════════
    @Query("""
        SELECT DISTINCT a FROM Activité a
        JOIN a.utilisateurs u
        JOIN a.projets p
        WHERE u.id = :utilisateurId
          AND p.id IN :projetIds
        """)
    List<Activité> findByUtilisateurIdAndProjetIdIn(
            @Param("utilisateurId") Long utilisateurId,
            @Param("projetIds") List<Long> projetIds
    );
}