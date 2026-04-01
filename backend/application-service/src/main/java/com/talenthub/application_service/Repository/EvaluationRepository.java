package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Evaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {
    List<Evaluation> findByUtilisateurId(Long utilisateurId);
}