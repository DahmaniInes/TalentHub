package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.CommentaireReclamation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentaireReclamationRepository extends JpaRepository<CommentaireReclamation, Long> {
    List<CommentaireReclamation> findByReclamationIdOrderByDateCreationAsc(Long reclamationId);
}
