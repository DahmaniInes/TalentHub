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

    // ✅ Somme de toutes les minutes travaillées sur un projet (toutes feuilles confondues)
    @Query("SELECT COALESCE(SUM(l.minutesTravaillees + l.minutesSupplementaires), 0) " +
            "FROM LigneFeuilleTemps l WHERE l.projetId = :projetId")
    Integer sumMinutesTravailleesByProjetId(@Param("projetId") Long projetId);

    // ✅ Somme de toutes les minutes travaillées sur une activité
    @Query("SELECT COALESCE(SUM(l.minutesTravaillees + l.minutesSupplementaires), 0) " +
            "FROM LigneFeuilleTemps l WHERE l.activiteId = :activiteId")
    Integer sumMinutesTravailleesByActiviteId(@Param("activiteId") Long activiteId);

    // Pour récupérer les IDs distincts de projets dans une feuille
    @Query("SELECT DISTINCT l.projetId FROM LigneFeuilleTemps l WHERE l.feuilleTemps.id = :ftId AND l.projetId IS NOT NULL")
    List<Long> findDistinctProjetIdsByFeuilleTempsId(@Param("ftId") Long ftId);

    // Pour récupérer les IDs distincts d'activités dans une feuille
    @Query("SELECT DISTINCT l.activiteId FROM LigneFeuilleTemps l WHERE l.feuilleTemps.id = :ftId AND l.activiteId IS NOT NULL")
    List<Long> findDistinctActiviteIdsByFeuilleTempsId(@Param("ftId") Long ftId);
}