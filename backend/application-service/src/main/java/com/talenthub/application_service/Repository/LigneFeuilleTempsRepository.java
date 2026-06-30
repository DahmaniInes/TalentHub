// Repository/LigneFeuilleTempsRepository.java
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.LigneFeuilleTemps;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LigneFeuilleTempsRepository extends JpaRepository<LigneFeuilleTemps, Long> {

    List<LigneFeuilleTemps> findByFeuilleTempsId(Long feuilleTempsId);

    @Modifying
    @Query("DELETE FROM LigneFeuilleTemps l WHERE l.feuilleTemps.id = :feuilleTempsId")
    void deleteByFeuilleTempsId(@Param("feuilleTempsId") Long feuilleTempsId);

    // ✅ Suppression en cascade des lignes référençant une activité
    // supprimée définitivement (voir ActiviteService.delete()).
    @Modifying
    @Query("DELETE FROM LigneFeuilleTemps l WHERE l.activiteId = :activiteId")
    void deleteByActiviteId(@Param("activiteId") Long activiteId);

    @Query("SELECT DISTINCT l.feuilleTemps.id FROM LigneFeuilleTemps l WHERE l.activiteId = :activiteId")
    List<Long> findDistinctFeuilleTempsIdsByActiviteId(@Param("activiteId") Long activiteId);

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Utilisée par GroupeService.removeMembre() pour décider
    // si une assignation d'activité doit être conservée : vrai s'il existe
    // au moins une ligne de feuille de temps pour cette activité ET dont
    // la feuille appartient à cet utilisateur précis (peu importe le
    // statut de la feuille).
    // ════════════════════════════════════════════════════════════
    @Query("""
        SELECT COUNT(l) > 0 FROM LigneFeuilleTemps l
        WHERE l.activiteId = :activiteId
          AND l.feuilleTemps.utilisateur.id = :utilisateurId
        """)
    boolean existsByActiviteIdAndUtilisateurId(
            @Param("activiteId") Long activiteId,
            @Param("utilisateurId") Long utilisateurId
    );

    @Query("SELECT COALESCE(SUM(l.minutesTravaillees + l.minutesSupplementaires), 0) " +
            "FROM LigneFeuilleTemps l WHERE l.projetId = :projetId")
    Integer sumMinutesTravailleesByProjetId(@Param("projetId") Long projetId);

    @Query("SELECT COALESCE(SUM(l.minutesTravaillees + l.minutesSupplementaires), 0) " +
            "FROM LigneFeuilleTemps l WHERE l.activiteId = :activiteId")
    Integer sumMinutesTravailleesByActiviteId(@Param("activiteId") Long activiteId);

    @Query("SELECT DISTINCT l.projetId FROM LigneFeuilleTemps l WHERE l.feuilleTemps.id = :ftId AND l.projetId IS NOT NULL")
    List<Long> findDistinctProjetIdsByFeuilleTempsId(@Param("ftId") Long ftId);

    @Query("SELECT DISTINCT l.activiteId FROM LigneFeuilleTemps l WHERE l.feuilleTemps.id = :ftId AND l.activiteId IS NOT NULL")
    List<Long> findDistinctActiviteIdsByFeuilleTempsId(@Param("ftId") Long ftId);

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Demande D : activités récentes côté serveur.
    // Liste des activiteId distincts sur lesquels cet utilisateur a déjà
    // pointé des heures, restreinte aux projets encore visibles pour lui
    // (filtrage appliqué par FeuilleTempsService, pas ici).
    // ════════════════════════════════════════════════════════════
    @Query("""
        SELECT l FROM LigneFeuilleTemps l
        WHERE l.feuilleTemps.utilisateur.id = :utilisateurId
          AND l.minutesTravaillees > 0
        ORDER BY l.date DESC
        """)
    List<LigneFeuilleTemps> findRecentesByUtilisateurId(@Param("utilisateurId") Long utilisateurId);
}