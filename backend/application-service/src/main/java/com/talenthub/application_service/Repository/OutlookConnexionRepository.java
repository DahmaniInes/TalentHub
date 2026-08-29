package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.OutlookConnexion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface OutlookConnexionRepository extends JpaRepository<OutlookConnexion, Long> {
    Optional<OutlookConnexion> findByUtilisateurId(Long utilisateurId);
}