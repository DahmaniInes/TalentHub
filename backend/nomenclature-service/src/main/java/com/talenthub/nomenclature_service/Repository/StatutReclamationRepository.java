package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.StatutReclamation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StatutReclamationRepository extends JpaRepository<StatutReclamation, Long> {
    List<StatutReclamation> findByActifTrue();
    boolean existsByCode(String code);
}
