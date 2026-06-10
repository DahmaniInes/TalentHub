// Service/AvancementService.java
// Recalcule automatiquement heuresPassees des projets et activités
// après chaque modification de feuille de temps
package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Repository.ActiviteRepository;
import com.talenthub.application_service.Repository.LigneFeuilleTempsRepository;
import com.talenthub.application_service.Repository.ProjetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AvancementService {

    private final LigneFeuilleTempsRepository ligneRepository;
    private final ProjetRepository            projetRepository;
    private final ActiviteRepository activiteRepository;

    /**
     * Recalcule heuresPassees pour un ensemble de projets et activités.
     * Appelé après create/update/delete d'une feuille de temps.
     */
    @Transactional
    public void recalculer(Set<Long> projetIds, Set<Long> activiteIds) {
        for (Long projetId : projetIds) {
            recalculerProjet(projetId);
        }
        for (Long activiteId : activiteIds) {
            recalculerActivite(activiteId);
        }
    }

    // ── Recalcul projet ────────────────────────────────────────────
    @Transactional
    public void recalculerProjet(Long projetId) {
        try {
            Projet projet = projetRepository.findById(projetId).orElse(null);
            if (projet == null) return;

            // Somme de toutes les minutes travaillées sur ce projet
            Integer totalMinutes = ligneRepository.sumMinutesTravailleesByProjetId(projetId);
            double heuresPassees = totalMinutes != null ? totalMinutes / 60.0 : 0.0;

            // Calcul avancement en % si heuresEstimees est défini
            int avancement = 0;
            if (projet.getHeuresEstimees() != null && projet.getHeuresEstimees() > 0) {
                avancement = (int) Math.min(100,
                        Math.round((heuresPassees / projet.getHeuresEstimees()) * 100));
            }

            // ✅ stocker dans heuresPassees (champ dédié, pas budgetConsomme)
            projet.setHeuresPassees(heuresPassees);
            projet.setAvancement(avancement);

            projetRepository.save(projet);
            log.debug("✅ Projet {} : {}h passées, {}% avancement", projetId, heuresPassees, avancement);
        } catch (Exception e) {
            log.warn("⚠️ Recalcul projet {} échoué: {}", projetId, e.getMessage());
        }
    }

    // ── Recalcul activité ──────────────────────────────────────────
    @Transactional
    public void recalculerActivite(Long activiteId) {
        try {
            Activité activite = activiteRepository.findById(activiteId).orElse(null);
            if (activite == null) return;

            Integer totalMinutes = ligneRepository.sumMinutesTravailleesByActiviteId(activiteId);
            double heuresPassees = totalMinutes != null ? totalMinutes / 60.0 : 0.0;

            activite.setHeuresPassees(heuresPassees);
            activiteRepository.save(activite);
            log.debug("✅ Activité {} : {}h passées", activiteId, heuresPassees);
        } catch (Exception e) {
            log.warn("⚠️ Recalcul activité {} échoué: {}", activiteId, e.getMessage());
        }
    }
}