package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.LigneFeuilleTemps;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LigneFeuilleTempsRepository extends JpaRepository<LigneFeuilleTemps, Long> {
    List<LigneFeuilleTemps> findByFeuilleTempsId(Long feuilleTempsId);
    void deleteByFeuilleTempsId(Long feuilleTempsId);
}