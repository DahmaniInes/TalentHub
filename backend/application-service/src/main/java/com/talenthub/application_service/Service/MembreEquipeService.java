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
    // ✅ NOUVEAU — relie le stagiaire à un stage précis sur le projet
    public MembreEquipe addStagiaire(Long projetId, Long utilisateurId,
                                     Long stageId, Double quota) {
        return addMembreAvecStage(projetId, utilisateurId, stageId, "STAGIAIRE", quota);
    }

    private MembreEquipe addMembreAvecStage(Long projetId, Long utilisateurId,
                                            Long stageId, String role, Double quota) {
        Projet projet = projetRepo.findById(projetId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet non trouvé: " + projetId));
        Utilisateur u = utilisateurRepo.findById(utilisateurId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + utilisateurId));

        // Vérifier si déjà membre
        if (membreRepo.existsByProjetIdAndUtilisateurId(projetId, utilisateurId)) {
            return membreRepo.findByProjetIdAndUtilisateurId(projetId, utilisateurId)
                    .orElseThrow();
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