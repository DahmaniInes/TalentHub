package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Rapport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RapportRepository extends JpaRepository<Rapport, Long> {
    List<Rapport> findByUtilisateurId(Long utilisateurId);
}