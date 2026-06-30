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

    @Query("""
        SELECT DISTINCT p FROM Projet p
        LEFT JOIN FETCH p.client
        LEFT JOIN FETCH p.groupes
        WHERE p.id = :id
        """)
    Optional<Projet> findByIdWithDetails(@Param("id") Long id);

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

    @Query("SELECT p FROM Projet p WHERE p.typeProjetId = :typeId")
    List<Projet> findByTypeProjetId(@Param("typeId") Long typeId);

    @Query("SELECT p.id FROM Projet p JOIN p.activites a WHERE a.id = :activiteId")
    List<Long> findProjetIdsByActiviteId(@Param("activiteId") Long activiteId);

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Projets d'entreprise (hors stage) dont AU MOINS UN
    // groupe assigné contient cet utilisateur. Sert de base au filtre
    // "mes équipes uniquement" du dropdown Projet dans Ma Semaine
    // (GET /projets/visibles-pour-feuille-temps), calculé désormais
    // côté backend plutôt qu'en JS.
    //
    // typeStageExclu : ID nomenclature du type STAGE_ACADEMIQUE (4),
    // passé en paramètre plutôt que codé en dur dans la requête pour
    // rester cohérent avec la constante définie côté service.
    // ════════════════════════════════════════════════════════════
    @Query("""
        SELECT DISTINCT p FROM Projet p
        JOIN p.groupes g
        JOIN g.membres m
        WHERE m.id = :utilisateurId
          AND p.typeProjetId != :typeStageExclu
        ORDER BY p.nom
        """)
    List<Projet> findVisiblesPourFeuilleTempsParGroupe(
            @Param("utilisateurId") Long utilisateurId,
            @Param("typeStageExclu") Long typeStageExclu
    );

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Intersection des projets visibles entre DEUX
    // utilisateurs : projets d'entreprise (hors stage) où CHACUN des deux
    // est membre d'un groupe assigné. Sert au dropdown Projet quand un
    // utilisateur avec TS_GROUP_READ/UPDATE a sélectionné un coéquipier
    // dans le sélecteur — l'intersection garantit qu'on ne propose que des
    // projets où les deux personnes ont un rattachement d'équipe réel.
    // ════════════════════════════════════════════════════════════
    @Query("""
        SELECT DISTINCT p FROM Projet p
        WHERE p.typeProjetId != :typeStageExclu
          AND EXISTS (
              SELECT 1 FROM p.groupes g1 JOIN g1.membres m1
              WHERE m1.id = :utilisateurId
          )
          AND EXISTS (
              SELECT 1 FROM p.groupes g2 JOIN g2.membres m2
              WHERE m2.id = :autreUtilisateurId
          )
        ORDER BY p.nom
        """)
    List<Projet> findIntersectionPourFeuilleTemps(
            @Param("utilisateurId") Long utilisateurId,
            @Param("autreUtilisateurId") Long autreUtilisateurId,
            @Param("typeStageExclu") Long typeStageExclu
    );
}