package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.FeuilleTempsRequest;
import com.talenthub.application_service.Entity.FeuilleTemps;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Exception.DuplicateResourceException;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.FeuilleTempsRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class FeuilleTempsService {

    private final FeuilleTempsRepository repository;
    private final UtilisateurRepository utilisateurRepository;

    public FeuilleTempsService(FeuilleTempsRepository repository,
                               UtilisateurRepository utilisateurRepository) {
        this.repository = repository;
        this.utilisateurRepository = utilisateurRepository;
    }

    public List<FeuilleTemps> getAllFeuillesTemps() {
        return repository.findAll();
    }

    public Optional<FeuilleTemps> getFeuilleTempsById(Long id) {
        return repository.findById(id);
    }

    public List<FeuilleTemps> getByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurIdOrderBySemaineDuDesc(utilisateurId);
    }

    public List<FeuilleTemps> getByStatut(String statut) {
        return repository.findByStatut(statut);
    }

    public FeuilleTemps create(FeuilleTempsRequest req) {
        Utilisateur utilisateur = utilisateurRepository.findById(req.getUtilisateurId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur non trouvé: " + req.getUtilisateurId()));

        // ✅ Vérifier doublon semaine
        repository.findByUtilisateurIdAndSemaineDu(req.getUtilisateurId(), req.getSemaineDu())
                .ifPresent(existing -> {
                    throw new DuplicateResourceException(
                            "Une feuille de temps existe déjà pour cette semaine.");
                });

        FeuilleTemps ft = FeuilleTemps.builder()
                .utilisateur(utilisateur)
                .semaineDu(req.getSemaineDu())
                .semaineAu(req.getSemaineAu())
                // ✅ Convertir minutes → heures pour le stockage
                .heuresTravaillees(req.getMinutesTravaillees() / 60.0)
                .heuresSupplementaires(req.getMinutesSupplementaires() / 60.0)
                .heuresAbsence(req.getMinutesAbsence() / 60.0)
                .statut(req.getStatut() != null ? req.getStatut() : "BROUILLON")
                .commentaireEmploye(req.getCommentaireEmploye())
                .build();

        return repository.save(ft);
    }

    public FeuilleTemps update(Long id, FeuilleTempsRequest req) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Feuille de temps non trouvée: " + id));

        // Bloquer modification si validée
        if ("VALIDEE".equals(ft.getStatut())) {
            throw new RuntimeException("Une feuille validée ne peut pas être modifiée.");
        }

        ft.setSemaineDu(req.getSemaineDu());
        ft.setSemaineAu(req.getSemaineAu());
        ft.setHeuresTravaillees(req.getMinutesTravaillees() / 60.0);
        ft.setHeuresSupplementaires(req.getMinutesSupplementaires() / 60.0);
        ft.setHeuresAbsence(req.getMinutesAbsence() / 60.0);
        ft.setCommentaireEmploye(req.getCommentaireEmploye());
        if (req.getStatut() != null) ft.setStatut(req.getStatut());

        return repository.save(ft);
    }

    public FeuilleTemps valider(Long id, String valideurKeycloakId, String commentaire) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Feuille de temps non trouvée: " + id));

        ft.setStatut("VALIDEE");
        ft.setValidePar(valideurKeycloakId);
        ft.setDateValidation(java.time.LocalDateTime.now());
        ft.setCommentaireValideur(commentaire);
        return repository.save(ft);
    }

    public FeuilleTemps rejeter(Long id, String valideurKeycloakId, String commentaire) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Feuille de temps non trouvée: " + id));

        ft.setStatut("REJETEE");
        ft.setValidePar(valideurKeycloakId);
        ft.setDateValidation(java.time.LocalDateTime.now());
        ft.setCommentaireValideur(commentaire);
        return repository.save(ft);
    }

    public FeuilleTemps soumettre(Long id) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Feuille de temps non trouvée: " + id));

        if (!"BROUILLON".equals(ft.getStatut()) && !"REJETEE".equals(ft.getStatut())) {
            throw new RuntimeException("Seules les feuilles en brouillon ou rejetées peuvent être soumises.");
        }
        ft.setStatut("SOUMISE");
        return repository.save(ft);
    }

    public void delete(Long id) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Feuille de temps non trouvée: " + id));
        if ("VALIDEE".equals(ft.getStatut())) {
            throw new RuntimeException("Impossible de supprimer une feuille validée.");
        }
        repository.deleteById(id);
    }
}