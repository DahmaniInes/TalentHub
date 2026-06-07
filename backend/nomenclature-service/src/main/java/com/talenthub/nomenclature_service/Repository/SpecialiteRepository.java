// SpecialiteRepository.java
package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.Specialite;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SpecialiteRepository extends JpaRepository<Specialite, Long> {
    List<Specialite> findByActifTrue();
    boolean existsByCode(String code);
    boolean existsByLibelleIgnoreCase(String libelle);
}