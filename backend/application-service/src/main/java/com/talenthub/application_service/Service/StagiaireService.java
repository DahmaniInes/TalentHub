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
import java.util.List;
import java.util.Map;

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

        // Champs académiques (IDs vers nomenclature)
        if (body.containsKey("universiteId") && body.get("universiteId") != null)
            u.setUniversiteId(Long.valueOf(body.get("universiteId").toString()));
        if (body.containsKey("specialiteId") && body.get("specialiteId") != null)
            u.setSpecialiteId(Long.valueOf(body.get("specialiteId").toString()));
        if (body.containsKey("niveauEtudeId") && body.get("niveauEtudeId") != null)
            u.setNiveauEtudeId(Long.valueOf(body.get("niveauEtudeId").toString()));

        // Champs personnels
        if (body.containsKey("nom"))       u.setNom(str(body, "nom"));
        if (body.containsKey("prenom"))    u.setPrenom(str(body, "prenom"));
        if (body.containsKey("telephone")) u.setTelephone(str(body, "telephone"));

        return utilisateurRepo.save(u);
    }

    // ── Assigner superviseurs (via StagiaireSuperviseur) ──────────
    @Transactional
    public Utilisateur assignerSuperviseurs(Long stagiaireId, List<Long> superviseurIds) {
        Utilisateur stagiaire = utilisateurRepo.findById(stagiaireId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stagiaire non trouvé: " + stagiaireId));

        // Trouver le stage actif
        Stage stageActif = stageRepo.findByUtilisateurId(stagiaireId)
                .stream().filter(s -> s.getStatutStageId() == null || s.getStatutStageId() == 2)
                .findFirst().orElse(null);

        for (Long supId : superviseurIds) {
            if (ssRepo.existsByStagiaireIdAndSuperviseurIdAndActifTrue(stagiaireId, supId))
                continue; // déjà assigné
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
        }
        return utilisateurRepo.findById(stagiaireId).orElseThrow();
    }

    // ── Retirer un superviseur ────────────────────────────────────
    @Transactional
    public Utilisateur retirerSuperviseur(Long stagiaireId, Long superviseurId) {
        ssRepo.findByStagiaireIdAndSuperviseurId(stagiaireId, superviseurId)
                .ifPresent(lien -> {
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