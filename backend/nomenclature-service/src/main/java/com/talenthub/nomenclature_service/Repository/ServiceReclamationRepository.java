package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.ServiceReclamation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServiceReclamationRepository extends JpaRepository<ServiceReclamation, Long> {
   List<ServiceReclamation> findByActifTrue();
   boolean existsByCode(String code);
}
