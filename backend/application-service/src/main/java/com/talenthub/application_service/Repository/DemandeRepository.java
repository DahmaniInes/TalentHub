package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Demande;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DemandeRepository extends JpaRepository<Demande, Long> {
    List<Demande> findByUtilisateurId(Long utilisateurId);
    List<Demande> findByStatutDemandeId(Long statutId);
    List<Demande> findByTypeDemandeId(Long typeId);
    List<Demande> findByUtilisateurIdOrderByDateCreationDesc(Long utilisateurId);
}