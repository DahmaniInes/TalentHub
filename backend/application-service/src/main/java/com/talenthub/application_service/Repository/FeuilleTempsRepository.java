package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.FeuilleTemps;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FeuilleTempsRepository extends JpaRepository<FeuilleTemps, Long> {
    List<FeuilleTemps> findByUtilisateurId(Long utilisateurId);
    List<FeuilleTemps> findByStatut(String statut);
    Optional<FeuilleTemps> findByUtilisateurIdAndSemaineDu(Long utilisateurId, LocalDate semaineDu);
    List<FeuilleTemps> findByUtilisateurIdOrderBySemaineDuDesc(Long utilisateurId);
}