package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.StagiaireSuperviseur;
import com.talenthub.application_service.Entity.Stage;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StagiaireService {

    private final UtilisateurRepository          utilisateurRepo;
    private final ProfilPermissionRepository     profilPermRepo;
    private final StagiaireSuperviseurRepository ssRepo;
    private final StageRepository                stageRepo;

    // ── Tous les stagiaires ──────────────────────────────────────
    @Transactional(readOnly = true)
    public List<Utilisateur> getAllStagiaires() {
        return utilisateurRepo.findAllStagiaires();
    }

    // ── Mes stagiaires (via StagiaireSuperviseur) ─────────────────
    @Transactional(readOnly = true)
    public List<Utilisateur> getMesStagiaires(Long superviseurId) {
        return utilisateurRepo.findStagiairesBySuperviseurId(superviseurId);
    }

    // ── Superviseurs éligibles ────────────────────────────────────
    @Transactional(readOnly = true)
    public List<Utilisateur> getSuperviseurs() {
        return utilisateurRepo.findAll().stream()
                .filter(u -> u.getProfil() != null && u.getKeycloakId() != null)
                .filter(u -> profilPermRepo.findPermissionCodesByProfilId(u.getProfil().getId())
                        .contains("INT_SUPER_CAN_SUPERVISE"))
                .toList();
    }

    // ── Mettre à jour les infos académiques d'un stagiaire ────────
    @Transactional
    public Utilisateur updateStagiaire(Long id, Map<String, Object> body) {
        Utilisateur u = utilisateurRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stagiaire non trouvé: " + id));

        if (body.containsKey("universiteId") && body.get("universiteId") != null)
            u.setUniversiteId(Long.valueOf(body.get("universiteId").toString()));
        if (body.containsKey("specialiteId") && body.get("specialiteId") != null)
            u.setSpecialiteId(Long.valueOf(body.get("specialiteId").toString()));
        if (body.containsKey("niveauEtudeId") && body.get("niveauEtudeId") != null)
            u.setNiveauEtudeId(Long.valueOf(body.get("niveauEtudeId").toString()));

        if (body.containsKey("nom"))       u.setNom(str(body, "nom"));
        if (body.containsKey("prenom"))    u.setPrenom(str(body, "prenom"));
        if (body.containsKey("telephone")) u.setTelephone(str(body, "telephone"));

        return utilisateurRepo.save(u);
    }

    /**
     * ✅ CORRIGÉ (v2) — Synchronise la liste COMPLÈTE des superviseurs actifs
     * d'un stagiaire avec `superviseurIds`.
     *
     * BUG CORRIGÉ ICI : la table stagiaire_superviseurs a une contrainte
     * UNIQUE sur (stagiaire_id, superviseur_id) — il ne peut donc EXISTER
     * QU'UNE SEULE LIGNE par couple, active ou non (pas d'historique
     * multi-lignes). La version précédente, en présence d'une ligne déjà
     * existante mais inactive (un superviseur retiré puis ré-ajouté),
     * tentait un INSERT au lieu de réactiver la ligne existante → violation
     * de contrainte unique → 500 (SQLState 23505, "stagiaire_superviseurs_pkey").
     *
     * CORRECTION : pour chaque superviseur à ajouter, on cherche d'abord
     * s'il existe DÉJÀ une ligne (peu importe son état actif) via
     * findByStagiaireIdAndSuperviseurId(). Si oui → on la RÉACTIVE
     * (actif=true, dateFin=null, nouvelle dateDebut). Si non → on en crée
     * une nouvelle, comme avant.
     */
    @Transactional
    public Utilisateur assignerSuperviseurs(Long stagiaireId, List<Long> superviseurIds) {
        Utilisateur stagiaire = utilisateurRepo.findById(stagiaireId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stagiaire non trouvé: " + stagiaireId));

        Stage stageActif = stageRepo.findByUtilisateurId(stagiaireId)
                .stream().filter(s -> s.getStatutStageId() == null || s.getStatutStageId() == 2)
                .findFirst().orElse(null);

        Set<Long> idsVoulus = new HashSet<>(superviseurIds != null ? superviseurIds : List.of());

        // ── Liens actuellement actifs pour ce stagiaire ──
        List<StagiaireSuperviseur> liensActifs = ssRepo.findByStagiaireIdAndActifTrue(stagiaireId);

        // ── RETRAIT : désactiver les liens actifs dont le superviseur n'est plus voulu ──
        for (StagiaireSuperviseur lien : liensActifs) {
            Long supId = lien.getSuperviseur().getId();
            if (!idsVoulus.contains(supId)) {
                lien.setActif(false);
                lien.setDateFin(LocalDate.now());
                ssRepo.save(lien);
                log.info("➖ Superviseur {} retiré du stagiaire {}", supId, stagiaireId);
            }
        }

        // ── AJOUT / RÉACTIVATION : pour chaque superviseur voulu pas déjà actif ──
        Set<Long> idsDejaActifs = liensActifs.stream()
                .map(l -> l.getSuperviseur().getId())
                .collect(Collectors.toSet());

        for (Long supId : idsVoulus) {
            if (idsDejaActifs.contains(supId)) continue; // déjà actif, rien à faire

            // ✅ Cherche une ligne EXISTANTE pour ce couple (active ou non) avant
            // de décider d'insérer — sinon on viole la contrainte unique.
            var ligneExistante = ssRepo.findByStagiaireIdAndSuperviseurId(stagiaireId, supId);

            if (ligneExistante.isPresent()) {
                // Réactive la ligne existante au lieu d'en créer une nouvelle.
                StagiaireSuperviseur lien = ligneExistante.get();
                lien.setActif(true);
                lien.setDateFin(null);
                lien.setDateDebut(LocalDate.now());
                lien.setStage(stageActif);
                ssRepo.save(lien);
                log.info("🔄 Superviseur {} réactivé pour le stagiaire {}", supId, stagiaireId);
            } else {
                Utilisateur superviseur = utilisateurRepo.findById(supId)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Superviseur non trouvé: " + supId));
                StagiaireSuperviseur lien = StagiaireSuperviseur.builder()
                        .stagiaire(stagiaire)
                        .superviseur(superviseur)
                        .stage(stageActif)
                        .dateDebut(LocalDate.now())
                        .actif(true)
                        .build();
                ssRepo.save(lien);
                log.info("➕ Superviseur {} ajouté au stagiaire {}", supId, stagiaireId);
            }
        }

        return utilisateurRepo.findById(stagiaireId).orElseThrow();
    }

    // ── Retirer un superviseur (action ponctuelle, hors synchro complète) ──
    @Transactional
    public Utilisateur retirerSuperviseur(Long stagiaireId, Long superviseurId) {
        // ✅ Ne cible que le lien ACTIF — évite toute ambiguïté si plusieurs
        // lignes historiques inactives existent pour le même couple.
        ssRepo.findByStagiaireIdAndActifTrue(stagiaireId).stream()
                .filter(l -> l.getSuperviseur().getId().equals(superviseurId))
                .forEach(lien -> {
                    lien.setActif(false);
                    lien.setDateFin(LocalDate.now());
                    ssRepo.save(lien);
                });
        return utilisateurRepo.findById(stagiaireId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stagiaire non trouvé: " + stagiaireId));
    }

    private String str(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v != null ? v.toString() : null;
    }
}