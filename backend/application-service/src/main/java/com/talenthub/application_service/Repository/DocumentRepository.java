package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByUtilisateurId(Long utilisateurId);

    List<Document> findByProjetId(Long projetId);

    // ✅ NOUVEAU — documents liés à une activité
    List<Document> findByActiviteId(Long activiteId);

    List<Document> findByStageId(Long stageId);

    // Documents actifs d'un projet (statut = ACTIF = 1)
    @Query("SELECT d FROM Document d WHERE d.projet.id = :projetId AND d.statutDocumentId = 1")
    List<Document> findActifsByProjetId(Long projetId);

    // Documents actifs d'une activité
    @Query("SELECT d FROM Document d WHERE d.activite.id = :activiteId AND d.statutDocumentId = 1")
    List<Document> findActifsByActiviteId(Long activiteId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Document d WHERE d.projet.id = :projetId")
    int deleteByProjetId(Long projetId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Document d WHERE d.activite.id = :activiteId")
    int deleteByActiviteId(Long activiteId);
}