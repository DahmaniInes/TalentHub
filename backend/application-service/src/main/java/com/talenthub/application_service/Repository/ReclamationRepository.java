package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Reclamation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReclamationRepository extends JpaRepository<Reclamation, Long> {
    List<Reclamation> findByUtilisateurId(Long utilisateurId);
}