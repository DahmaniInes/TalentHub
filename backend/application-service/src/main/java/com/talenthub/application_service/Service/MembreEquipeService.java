package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.MembreEquipe;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Entity.Stage;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MembreEquipeService {

    // ✅ EN_COURS = id 2 dans la nomenclature statut_stage (confirmé en base)
    private static final Long STATUT_STAGE_EN_COURS_ID = 2L;

    private final MembreEquipeRepository membreRepo;
    private final ProjetRepository       projetRepo;
    private final UtilisateurRepository  utilisateurRepo;
    private final StageRepository        stageRepo;

    @Transactional(readOnly = true)
    public List<MembreEquipe> getByProjet(Long projetId) {
        return membreRepo.findByProjetId(projetId);
    }

    @Transactional(readOnly = true)
    public List<MembreEquipe> getByUtilisateur(Long userId) {
        return membreRepo.findByUtilisateurId(userId);
    }

    // ── Ajouter un membre (employé) ──────────────────────────────
    public MembreEquipe addMembre(Long projetId, Long utilisateurId,
                                  String role, Double quota) {
        return addMembreAvecStage(projetId, utilisateurId, null, role, quota);
    }

    // ── Ajouter un stagiaire avec son stage ──────────────────────
    // ✅ CORRIGÉ — si stageId n'est pas fourni par l'appelant, on résout
    // (ou on crée si besoin) automatiquement le stage actif de l'utilisateur,
    // au lieu de laisser stage=null (ce qui faisait disparaître le stagiaire
    // de ProjetDTO.stagiaires, dont le filtre exige un Stage lié).
    public MembreEquipe addStagiaire(Long projetId, Long utilisateurId,
                                     Long stageId, Double quota) {
        Long resolvedStageId = stageId != null
                ? stageId
                : resoudreOuCreerStageActif(utilisateurId).getId();
        return addMembreAvecStage(projetId, utilisateurId, resolvedStageId, "STAGIAIRE", quota);
    }

    /**
     * Retourne le stage actif (statutStageId = EN_COURS) de l'utilisateur s'il existe.
     * Sinon, en crée un nouveau avec ce statut et le persiste.
     */
    private Stage resoudreOuCreerStageActif(Long utilisateurId) {
        return stageRepo.findStageActifByUtilisateur(utilisateurId)
                .orElseGet(() -> {
                    Utilisateur u = utilisateurRepo.findById(utilisateurId)
                            .orElseThrow(() -> new ResourceNotFoundException(
                                    "Utilisateur non trouvé: " + utilisateurId));
                    Stage nouveauStage = Stage.builder()
                            .utilisateur(u)
                            .statutStageId(STATUT_STAGE_EN_COURS_ID)
                            .build();
                    return stageRepo.save(nouveauStage);
                });
    }

    private MembreEquipe addMembreAvecStage(Long projetId, Long utilisateurId,
                                            Long stageId, String role, Double quota) {
        Projet projet = projetRepo.findById(projetId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet non trouvé: " + projetId));
        Utilisateur u = utilisateurRepo.findById(utilisateurId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + utilisateurId));

        // Vérifier si déjà membre
        if (membreRepo.existsByProjetIdAndUtilisateurId(projetId, utilisateurId)) {
            MembreEquipe existant = membreRepo.findByProjetIdAndUtilisateurId(projetId, utilisateurId)
                    .orElseThrow();
            // ✅ Si le membre existait déjà SANS stage lié (cas des anciens bugs),
            // on le relie maintenant au stage résolu pour qu'il apparaisse bien
            // dans ProjetDTO.stagiaires.
            if (stageId != null && existant.getStage() == null) {
                Stage stage = stageRepo.findById(stageId)
                        .orElseThrow(() -> new ResourceNotFoundException("Stage non trouvé: " + stageId));
                existant.setStage(stage);
                return membreRepo.save(existant);
            }
            return existant;
        }

        MembreEquipe.MembreEquipeBuilder builder = MembreEquipe.builder()
                .projet(projet)
                .utilisateur(u)
                .role(role != null ? role : "MEMBRE")
                .quotaHoraire(quota)
                .actif(true);

        // ✅ Lier au stage si stagiaire
        if (stageId != null) {
            Stage stage = stageRepo.findById(stageId)
                    .orElseThrow(() -> new ResourceNotFoundException("Stage non trouvé: " + stageId));
            builder.stage(stage);
        }

        return membreRepo.save(builder.build());
    }

    public MembreEquipe updateRole(Long id, String role, Double quota) {
        MembreEquipe m = membreRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Membre non trouvé: " + id));
        if (role  != null) m.setRole(role);
        if (quota != null) m.setQuotaHoraire(quota);
        return membreRepo.save(m);
    }

    public void removeMembre(Long projetId, Long userId) {
        membreRepo.findByProjetIdAndUtilisateurId(projetId, userId)
                .ifPresent(m -> membreRepo.deleteById(m.getId()));
    }

    public void delete(Long id) {
        if (!membreRepo.existsById(id))
            throw new ResourceNotFoundException("Membre non trouvé: " + id);
        membreRepo.deleteById(id);
    }
}