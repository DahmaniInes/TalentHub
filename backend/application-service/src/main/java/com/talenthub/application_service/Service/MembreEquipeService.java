package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.MembreEquipe;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Repository.MembreEquipeRepository;
import com.talenthub.application_service.Repository.ProjetRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MembreEquipeService {

    private final MembreEquipeRepository membreRepo;
    private final ProjetRepository projetRepo;
    private final UtilisateurRepository utilisateurRepo;

    @Transactional(readOnly = true)
    public List<MembreEquipe> getByProjet(Long projetId) {
        return membreRepo.findByProjetIdAndActifTrue(projetId);
    }

    @Transactional(readOnly = true)
    public List<MembreEquipe> getByUtilisateur(Long userId) {
        return membreRepo.findByUtilisateurId(userId);
    }

    @Transactional
    public MembreEquipe addMembre(Long projetId, Long utilisateurId, String role, Double quotaHoraire) {
        if (membreRepo.existsByProjetIdAndUtilisateurId(projetId, utilisateurId)) {
            throw new RuntimeException("Cet utilisateur est déjà membre du projet.");
        }
        Projet projet = projetRepo.findById(projetId)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé: " + projetId));
        Utilisateur utilisateur = utilisateurRepo.findById(utilisateurId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé: " + utilisateurId));

        MembreEquipe membre = MembreEquipe.builder()
                .projet(projet)
                .utilisateur(utilisateur)
                .role(role != null ? role : "MEMBRE")
                .quotaHoraire(quotaHoraire)
                .actif(true)
                .build();
        return membreRepo.save(membre);
    }

    @Transactional
    public MembreEquipe updateRole(Long membreId, String role, Double quotaHoraire) {
        MembreEquipe m = membreRepo.findById(membreId)
                .orElseThrow(() -> new RuntimeException("MembreEquipe non trouvé: " + membreId));
        m.setRole(role);
        m.setQuotaHoraire(quotaHoraire);
        return membreRepo.save(m);
    }

    @Transactional
    public void removeMembre(Long projetId, Long utilisateurId) {
        MembreEquipe m = membreRepo.findByProjetIdAndUtilisateurId(projetId, utilisateurId)
                .orElseThrow(() -> new RuntimeException("Membre non trouvé."));
        m.setActif(false);
        membreRepo.save(m);
    }

    @Transactional
    public void delete(Long id) {
        membreRepo.deleteById(id);
    }
}
