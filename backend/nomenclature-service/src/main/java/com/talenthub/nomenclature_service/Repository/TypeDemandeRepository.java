package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.TypeDemande;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TypeDemandeRepository extends JpaRepository<TypeDemande, Long> {
    List<TypeDemande> findByActifTrue();
    boolean existsByCode(String code);
}