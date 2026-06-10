package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.StatutStage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StatutStageRepository extends JpaRepository<StatutStage, Long> {
    List<StatutStage> findByActifTrueOrderByOrdreAffichageAsc();
}
