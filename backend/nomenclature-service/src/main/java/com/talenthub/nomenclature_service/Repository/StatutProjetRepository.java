package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.StatutProjet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StatutProjetRepository extends JpaRepository<StatutProjet, Long> {
    List<StatutProjet> findByActifTrueOrderByOrdreAffichageAsc();
}
