// ActiviteStageRepository.java
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.ActiviteStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ActiviteStageRepository extends JpaRepository<ActiviteStage, Long> {

    List<ActiviteStage> findByProjetId(Long projetId);

    @Query("SELECT a FROM ActiviteStage a WHERE a.assigne.id = :userId OR a.createur.id = :userId")
    List<ActiviteStage> findByUserId(@Param("userId") Long userId);





}