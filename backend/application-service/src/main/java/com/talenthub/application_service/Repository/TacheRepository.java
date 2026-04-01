package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Tache;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TacheRepository extends JpaRepository<Tache, Long> {
    List<Tache> findByUtilisateurId(Long utilisateurId);
    List<Tache> findByProjetId(Long projetId);
}