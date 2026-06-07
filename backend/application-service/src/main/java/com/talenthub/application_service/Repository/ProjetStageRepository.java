// ProjetStageRepository.java
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.ProjetStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ProjetStageRepository extends JpaRepository<ProjetStage, Long> {

    @Query("SELECT p FROM ProjetStage p JOIN p.stagiaires s WHERE s.id = :stagiaireId")
    List<ProjetStage> findByStagiaireId(@Param("stagiaireId") Long stagiaireId);

    @Query("SELECT DISTINCT p FROM ProjetStage p JOIN p.stagiaires s JOIN s.superviseurs sup WHERE sup.id = :superviseurId")
    List<ProjetStage> findBySuperviseurId(@Param("superviseurId") Long superviseurId);
}