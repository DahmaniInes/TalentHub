package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.StatutDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface StatutDocumentRepository extends JpaRepository<StatutDocument, Long> {
    List<StatutDocument> findByActifTrue();
    Optional<StatutDocument> findByCode(String code);
}