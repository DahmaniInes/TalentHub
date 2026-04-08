package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.CategorieEntree;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CategorieEntreeRepository extends JpaRepository<CategorieEntree, Long> {
    List<CategorieEntree> findByActifTrue();
    boolean existsByCode(String code);
}