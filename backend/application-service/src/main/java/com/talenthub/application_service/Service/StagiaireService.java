package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import com.talenthub.application_service.Repository.ProfilPermissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class StagiaireService {

    private final UtilisateurRepository      utilisateurRepo;
    private final ProfilPermissionRepository profilPermRepo;

    // ── Lister tous les stagiaires ──────────────────────────────────────
    // Détection via profilNom contenant "stagiaire" (insensible à la casse)
    @Transactional(readOnly = true)
    public List<Utilisateur> getAllStagiaires() {
        return utilisateurRepo.findAll().stream()
                .filter(u -> u.getProfil() != null
                        && u.getProfil().getNom() != null
                        && u.getProfil().getNom().toLowerCase().contains("stagiaire"))
                .toList();
    }

    // ── Lister les stagiaires d'un superviseur ──────────────────────────
    @Transactional(readOnly = true)
    public List<Utilisateur> getMesStagiaires(Long superviseurId) {
        return utilisateurRepo.findStagiairesBySuperviseurId(superviseurId);
    }

    // ── Lister les superviseurs éligibles (permission INT_SUPER_CAN_SUPERVISE) ──
    @Transactional(readOnly = true)
    public List<Utilisateur> getSuperviseurs() {
        return utilisateurRepo.findAll().stream()
                .filter(u -> u.getProfil() != null && u.getKeycloakId() != null)
                .filter(u -> profilPermRepo.findPermissionCodesByProfilId(u.getProfil().getId())
                        .contains("INT_SUPER_CAN_SUPERVISE"))
                .toList();
    }

    // ── Mettre à jour les infos stagiaire ───────────────────────────────
    @Transactional
    public Utilisateur updateStagiaire(Long id, Map<String, Object> body) {
        Utilisateur u = utilisateurRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Stagiaire non trouvé: " + id));

        if (body.containsKey("universite"))   u.setUniversite(str(body, "universite"));
        if (body.containsKey("specialite"))   u.setSpecialite(str(body, "specialite"));
        if (body.containsKey("niveauEtude"))  u.setNiveauEtude(str(body, "niveauEtude"));
        if (body.containsKey("typeStageId") && body.get("typeStageId") != null)
            u.setTypeStageId(Long.valueOf(body.get("typeStageId").toString()));
        if (body.containsKey("dateDebutStage") && body.get("dateDebutStage") != null)
            u.setDateDebutStage(java.time.LocalDate.parse(body.get("dateDebutStage").toString()));
        if (body.containsKey("dateFinStage") && body.get("dateFinStage") != null)
            u.setDateFinStage(java.time.LocalDate.parse(body.get("dateFinStage").toString()));
        if (body.containsKey("dateSoutenance") && body.get("dateSoutenance") != null)
            u.setDateSoutenance(java.time.LocalDate.parse(body.get("dateSoutenance").toString()));

        return utilisateurRepo.save(u);
    }

    // ── Assigner des superviseurs ────────────────────────────────────────
    @Transactional
    public Utilisateur assignerSuperviseurs(Long stagiaireId, List<Long> superviseurIds) {
        Utilisateur stagiaire = utilisateurRepo.findById(stagiaireId)
                .orElseThrow(() -> new ResourceNotFoundException("Stagiaire non trouvé: " + stagiaireId));
        List<Utilisateur> superviseurs = utilisateurRepo.findAllById(superviseurIds);
        stagiaire.setSuperviseurs(superviseurs);
        return utilisateurRepo.save(stagiaire);
    }

    // ── Retirer un superviseur ───────────────────────────────────────────
    @Transactional
    public Utilisateur retirerSuperviseur(Long stagiaireId, Long superviseurId) {
        Utilisateur stagiaire = utilisateurRepo.findById(stagiaireId)
                .orElseThrow(() -> new ResourceNotFoundException("Stagiaire non trouvé: " + stagiaireId));
        stagiaire.getSuperviseurs().removeIf(s -> s.getId().equals(superviseurId));
        return utilisateurRepo.save(stagiaire);
    }

    private String str(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v != null ? v.toString() : null;
    }
}