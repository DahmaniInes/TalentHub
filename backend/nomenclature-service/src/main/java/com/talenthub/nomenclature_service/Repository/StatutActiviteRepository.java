package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.StatutActivité;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StatutActiviteRepository extends JpaRepository<StatutActivité, Long> {
    List<StatutActivité> findByActifTrueOrderByOrdre();
    Optional<StatutActivité> findByCode(String code);
}