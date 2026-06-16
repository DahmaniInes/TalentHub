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

import java.util.List;
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
        // 1. Recalculer d'abord toutes les activités
        for (Long activiteId : activiteIds) {
            recalculerActivite(activiteId);
        }
        // 2. Puis recalculer les projets (qui lisent les heuresPassees des activités)
        for (Long projetId : projetIds) {
            recalculerProjet(projetId);
        }
    }
    // ── Recalcul projet ────────────────────────────────────────────



    @Transactional
    public void recalculerProjet(Long projetId) {
        try {
            Projet projet = projetRepository.findById(projetId).orElse(null);
            if (projet == null) return;

            // 1. heuresPassees = somme des heuresPassees de toutes les activités du projet
            List<Activité> activites = activiteRepository.findByProjetId(projetId);
            double heuresPassees = activites.stream()
                    .mapToDouble(a -> a.getHeuresPassees() != null ? a.getHeuresPassees() : 0.0)
                    .sum();

            // 2. heuresEstimees : si pas défini par l'user → somme des activités
            double heuresEstimees;
            if (projet.getHeuresEstimees() != null && projet.getHeuresEstimees() > 0) {
                heuresEstimees = projet.getHeuresEstimees();
            } else {
                heuresEstimees = activites.stream()
                        .mapToDouble(a -> a.getHeuresEstimees() != null ? a.getHeuresEstimees() : 0.0)
                        .sum();
                // Stocker l'estimation calculée si elle n'était pas définie
                if (heuresEstimees > 0) {
                    projet.setHeuresEstimees(heuresEstimees);
                }
            }

            // 3. Avancement = heuresPassees / heuresEstimees * 100
            int avancement = 0;
            if (heuresEstimees > 0) {
                avancement = (int) Math.min(100, Math.round((heuresPassees / heuresEstimees) * 100));
            }

            projet.setHeuresPassees(heuresPassees);
            projet.setAvancement(avancement);
            projetRepository.save(projet);
            log.debug("✅ Projet {} : {}h passées / {}h estimées → {}%", projetId, heuresPassees, heuresEstimees, avancement);
        } catch (Exception e) {
            log.warn("⚠️ Recalcul projet {} échoué: {}", projetId, e.getMessage());
        }
    }


    /**
     * Appelé quand une activité est créée/modifiée/supprimée.
     * Recalcule automatiquement tous les projets liés.
     */
    private static final Long STATUT_EN_COURS_ID = 2L;
    private static final Long STATUT_TERMINE_ID  = 4L;

    @Transactional
    public void recalculerActivite(Long activiteId) {
        try {
            Activité activite = activiteRepository.findById(activiteId).orElse(null);
            if (activite == null) return;

            double heuresPasseesAvant = activite.getHeuresPassees() != null
                    ? activite.getHeuresPassees() : 0.0;

            Integer totalMinutes = ligneRepository.sumMinutesTravailleesByActiviteId(activiteId);
            double heuresPassees = totalMinutes != null ? totalMinutes / 60.0 : 0.0;

            activite.setHeuresPassees(heuresPassees);

            // ✅ Statut auto : 0 → >0 = "En cours"
            if (heuresPasseesAvant == 0.0 && heuresPassees > 0.0) {
                Long statutActuel = activite.getStatutActiviteId();
                // Ne pas changer si déjà En cours ou Terminé
                if (!STATUT_EN_COURS_ID.equals(statutActuel) && !STATUT_TERMINE_ID.equals(statutActuel)) {
                    activite.setStatutActiviteId(STATUT_EN_COURS_ID);
                    log.info("✅ Activité {} passée à 'En cours'", activiteId);
                }
            }

            // ✅ Statut auto : 100% = "Terminé"
            Double heuresEstimees = activite.getHeuresEstimees();
            if (heuresEstimees != null && heuresEstimees > 0 && heuresPassees >= heuresEstimees) {
                activite.setStatutActiviteId(STATUT_TERMINE_ID);
                log.info("✅ Activité {} passée à 'Terminé' ({}h >= {}h)",
                        activiteId, heuresPassees, heuresEstimees);
            }

            activiteRepository.save(activite);
            log.debug("✅ Activité {} : {}h passées", activiteId, heuresPassees);
        } catch (Exception e) {
            log.warn("⚠️ Recalcul activité {} échoué: {}", activiteId, e.getMessage());
        }
    }

    // ── Recalcul activité ──────────────────────────────────────────

}