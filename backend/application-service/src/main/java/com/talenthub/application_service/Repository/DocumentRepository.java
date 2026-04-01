package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByUtilisateurId(Long utilisateurId);
    List<Document> findByProjetId(Long projetId);
}