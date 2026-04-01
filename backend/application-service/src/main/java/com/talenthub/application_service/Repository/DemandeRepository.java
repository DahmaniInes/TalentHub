package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Demande;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DemandeRepository extends JpaRepository<Demande, Long> {
    List<Demande> findByUtilisateurId(Long utilisateurId);
}