package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.StatutFeuilleTemps;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StatutFeuilleTempsRepository extends JpaRepository<StatutFeuilleTemps, Long> {
    List<StatutFeuilleTemps> findByActifTrue();
    boolean existsByCode(String code);
}