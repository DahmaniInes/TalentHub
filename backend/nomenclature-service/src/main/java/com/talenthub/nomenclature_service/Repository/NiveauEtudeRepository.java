// NiveauEtudeRepository.java
package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.NiveauEtude;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NiveauEtudeRepository extends JpaRepository<NiveauEtude, Long> {
    List<NiveauEtude> findByActifTrueOrderByOrdreAffichageAsc();
    boolean existsByCode(String code);
}