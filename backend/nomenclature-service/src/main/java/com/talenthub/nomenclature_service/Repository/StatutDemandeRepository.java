package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.StatutDemande;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StatutDemandeRepository extends JpaRepository<StatutDemande, Long> {
    List<StatutDemande> findByActifTrue();
    boolean existsByCode(String code);
}