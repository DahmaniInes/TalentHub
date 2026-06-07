// UniversiteRepository.java
package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.Universite;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UniversiteRepository extends JpaRepository<Universite, Long> {
    List<Universite> findByActifTrue();
    boolean existsByCode(String code);
    boolean existsByLibelleIgnoreCase(String libelle);
}