// ═══════════════════════════════════════════════════════
// ActiviteRepository.java — CORRIGÉ sans enum
// ═══════════════════════════════════════════════════════
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Activité;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ActiviteRepository extends JpaRepository<Activité, Long> {
    List<Activité> findByProjetId(Long projetId);
    List<Activité> findByUtilisateurId(Long utilisateurId);
    // ✅ Filtre par ID statut (pas par enum)
    List<Activité> findByProjetIdAndStatutActiviteId(Long projetId, Long statutActiviteId);
    List<Activité> findByProjetIdOrderByNumeroActivite(Long projetId);
    long countByProjetId(Long projetId);
}
 