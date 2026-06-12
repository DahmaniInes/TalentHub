package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.TypeDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TypeDocumentRepository extends JpaRepository<TypeDocument, Long> {
    List<TypeDocument> findByActifTrue();
    Optional<TypeDocument> findByCode(String code);
}