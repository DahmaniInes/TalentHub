package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.FeuilleTempsRequest;
import com.talenthub.application_service.DTO.LigneFeuilleTempsRequest;
import com.talenthub.application_service.Entity.FeuilleTemps;
import com.talenthub.application_service.Entity.LigneFeuilleTemps;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Exception.DuplicateResourceException;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.FeuilleTempsRepository;
import com.talenthub.application_service.Repository.LigneFeuilleTempsRepository;
import com.talenthub.application_service.Repository.ProfilPermissionRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.talenthub.application_service.Enum.NotificationType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class FeuilleTempsService {

    private final FeuilleTempsRepository        repository;
    private final UtilisateurRepository         utilisateurRepository;
    private final LigneFeuilleTempsRepository   ligneRepository;
    private final NotificationService           notificationService;
    private final ProfilPermissionRepository    profilPermissionRepository;

    public FeuilleTempsService(
            FeuilleTempsRepository repository,
            UtilisateurRepository utilisateurRepository,
            LigneFeuilleTempsRepository ligneRepository,
            NotificationService notificationService,
            ProfilPermissionRepository profilPermissionRepository) {
        this.repository                  = repository;
        this.utilisateurRepository       = utilisateurRepository;
        this.ligneRepository             = ligneRepository;
        this.notificationService         = notificationService;
        this.profilPermissionRepository  = profilPermissionRepository;
    }

    // ── Lecture ──
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

    public List<FeuilleTemps> getFeuillesSoumises() {
        return repository.findByStatut("SOUMISE");
    }

    public List<FeuilleTemps> getPourApprobation() {
        return repository.findByStatutIn(List.of("SOUMISE", "VALIDEE", "REJETEE"));
    }

    // ── Créer ──
    public FeuilleTemps create(FeuilleTempsRequest req) {
        Utilisateur utilisateur = utilisateurRepository.findById(req.getUtilisateurId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur non trouvé: " + req.getUtilisateurId()));

        repository.findByUtilisateurIdAndSemaineDu(req.getUtilisateurId(), req.getSemaineDu())
                .ifPresent(existing -> {
                    throw new DuplicateResourceException(
                            "Une feuille de temps existe déjà pour cette semaine.");
                });

        FeuilleTemps ft = FeuilleTemps.builder()
                .utilisateur(utilisateur)
                .semaineDu(req.getSemaineDu())
                .semaineAu(req.getSemaineAu())
                .heuresTravaillees(req.getMinutesTravaillees() / 60.0)
                .heuresSupplementaires(req.getMinutesSupplementaires() / 60.0)
                .heuresAbsence(req.getMinutesAbsence() / 60.0)
                .statut(req.getStatut() != null ? req.getStatut() : "BROUILLON")
                .commentaireEmploye(req.getCommentaireEmploye())
                .build();

        FeuilleTemps saved = repository.save(ft);

        if (req.getLignes() != null && !req.getLignes().isEmpty()) {
            saveLignes(saved, req.getLignes());
        }

        return saved;
    }

    // ── Modifier ──
    public FeuilleTemps update(Long id, FeuilleTempsRequest req) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Feuille de temps non trouvée: " + id));

        if (!"BROUILLON".equals(ft.getStatut()) && !"REJETEE".equals(ft.getStatut())) {
            throw new RuntimeException(
                    "Seules les feuilles en brouillon ou rejetées peuvent être modifiées.");
        }

        verifierDeadline(ft.getSemaineDu());

        ft.setSemaineDu(req.getSemaineDu());
        ft.setSemaineAu(req.getSemaineAu());
        ft.setHeuresTravaillees(req.getMinutesTravaillees() / 60.0);
        ft.setHeuresSupplementaires(req.getMinutesSupplementaires() / 60.0);
        ft.setHeuresAbsence(req.getMinutesAbsence() / 60.0);
        ft.setCommentaireEmploye(req.getCommentaireEmploye());
        if (req.getStatut() != null) ft.setStatut(req.getStatut());

        if (req.getLignes() != null) {
            ligneRepository.deleteByFeuilleTempsId(ft.getId());
            saveLignes(ft, req.getLignes());
        }

        return repository.save(ft);
    }

    // ── Soumettre ──
    public FeuilleTemps soumettre(Long id) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Feuille de temps non trouvée: " + id));

        if (!"BROUILLON".equals(ft.getStatut()) && !"REJETEE".equals(ft.getStatut())) {
            throw new RuntimeException(
                    "Seules les feuilles en brouillon ou rejetées peuvent être soumises.");
        }

        verifierDeadline(ft.getSemaineDu());
        validerCoherence(ft);

        ft.setStatut("SOUMISE");
        FeuilleTemps saved = repository.save(ft);

        // ✅ Notifier tous les approbateurs
        notifierApprobateurs(saved);

        return saved;
    }

    // ── Annuler soumission ──
    public FeuilleTemps annulerSoumission(Long id) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Feuille de temps non trouvée: " + id));

        if (!"SOUMISE".equals(ft.getStatut())) {
            throw new RuntimeException("Seules les feuilles soumises peuvent être annulées.");
        }

        ft.setStatut("BROUILLON");
        ft.setCommentaireValideur(null);
        return repository.save(ft);
    }

    // ── Valider ──
    public FeuilleTemps valider(Long id, String valideurKeycloakId, String commentaire) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Feuille de temps non trouvée: " + id));

        if (!"SOUMISE".equals(ft.getStatut())) {
            throw new RuntimeException("Seules les feuilles soumises peuvent être validées.");
        }

        ft.setStatut("VALIDEE");
        ft.setValidePar(valideurKeycloakId);
        ft.setDateValidation(LocalDateTime.now());
        ft.setCommentaireValideur(commentaire);
        FeuilleTemps saved = repository.save(ft);

        // ✅ Notifier l'employé — validation
        String kcId = saved.getUtilisateur().getKeycloakId();

        if (kcId != null) {
            notificationService.creer(
                    kcId,
                    NotificationType.FEUILLE_VALIDEE,   // ← enum
                    "Feuille de temps validée ✅",
                    "Votre feuille du " + saved.getSemaineDu() + " a été validée." +
                            (commentaire != null && !commentaire.isBlank()
                                    ? " Commentaire : " + commentaire : ""),
                    "/feuille-temps",
                    saved.getId()
            );
        }

        return saved;
    }

    // ── Rejeter ──
    public FeuilleTemps rejeter(Long id, String valideurKeycloakId, String commentaire) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Feuille de temps non trouvée: " + id));

        if (!"SOUMISE".equals(ft.getStatut())) {
            throw new RuntimeException("Seules les feuilles soumises peuvent être rejetées.");
        }

        if (commentaire == null || commentaire.trim().isEmpty()) {
            throw new RuntimeException(
                    "Un motif de rejet est obligatoire.");
        }

        ft.setStatut("REJETEE");
        ft.setValidePar(valideurKeycloakId);
        ft.setDateValidation(LocalDateTime.now());
        ft.setCommentaireValideur(commentaire);
        FeuilleTemps saved = repository.save(ft);

        // ✅ Notifier l'employé — rejet
        String kcId = saved.getUtilisateur().getKeycloakId();

        if (kcId != null) {
            notificationService.creer(
                    kcId,
                    NotificationType.FEUILLE_REJETEE,   // ← enum
                    "Feuille de temps rejetée ❌",
                    "Votre feuille du " + saved.getSemaineDu() +
                            " a été rejetée. Motif : " + commentaire,
                    "/feuille-temps",
                    saved.getId()
            );
        }
        return saved;
    }

    // ── Supprimer ──
    public void delete(Long id) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Feuille de temps non trouvée: " + id));

        if (!"BROUILLON".equals(ft.getStatut()) && !"REJETEE".equals(ft.getStatut())) {
            throw new RuntimeException(
                    "Seules les feuilles en brouillon ou rejetées peuvent être supprimées.");
        }

        ligneRepository.deleteByFeuilleTempsId(id);
        repository.deleteById(id);
    }

    // ── Règle 2 : Deadline ──
    private void verifierDeadline(LocalDate semaineDu) {
        LocalDate debutMoisSuivant = semaineDu.withDayOfMonth(1).plusMonths(1);
        LocalDate deadline = debutMoisSuivant.plusDays(2);
        if (LocalDate.now().isAfter(deadline)) {
            throw new RuntimeException(
                    "La période de saisie est clôturée. Vous ne pouvez plus modifier les feuilles du mois de "
                            + semaineDu.getMonth().getDisplayName(
                            java.time.format.TextStyle.FULL,
                            java.util.Locale.FRENCH) + ".");
        }
    }

    // ── Règle 3 : Cohérence ──
    private void validerCoherence(FeuilleTemps ft) {
        List<LigneFeuilleTemps> lignes = ligneRepository.findByFeuilleTempsId(ft.getId());

        if (lignes.isEmpty()) {
            throw new RuntimeException(
                    "Impossible de soumettre une feuille sans lignes de saisie.");
        }

        for (LigneFeuilleTemps l : lignes) {
            int totalJour = l.getMinutesNormales()
                    + l.getMinutesSupplementaires()
                    + l.getMinutesAbsence();

            if (totalJour > 1440) {
                throw new RuntimeException(
                        "Le total des heures du " + l.getDate() +
                                " dépasse 24h. Veuillez corriger.");
            }
        }
    }

    // ── Notifier les approbateurs quand une feuille est soumise ──
    private void notifierApprobateurs(FeuilleTemps ft) {
        utilisateurRepository.findAll().stream()
                .filter(u -> u.getProfil() != null && u.getKeycloakId() != null)
                .filter(u -> !u.getKeycloakId().equals(ft.getUtilisateur().getKeycloakId()))
                .forEach(u -> {
                    boolean aPermission = profilPermissionRepository
                            .findByProfilId(u.getProfil().getId())
                            .stream()
                            .anyMatch(pp ->
                                    pp.getPermission() != null &&
                                            "Traiter les feuilles de temps".equals(
                                                    pp.getPermission().getLibelle()) &&
                                            pp.isCanWrite()
                            );

                    if (aPermission) {
                        notificationService.creer(
                                u.getKeycloakId(),
                                NotificationType.FEUILLE_SOUMISE,   // ← enum
                                "Nouvelle feuille soumise 📋",
                                ft.getUtilisateur().getNomComplet() +
                                        " a soumis sa feuille de la semaine du " +
                                        ft.getSemaineDu(),
                                "/approbations-ft",
                                ft.getId()
                        );
                    }
                });
    }

    // ── Sauvegarder les lignes ──
    private void saveLignes(FeuilleTemps ft, List<LigneFeuilleTempsRequest> reqs) {
        reqs.forEach(r -> {
            LigneFeuilleTemps ligne = LigneFeuilleTemps.builder()
                    .feuilleTemps(ft)
                    .date(r.getDate())
                    .categorieCode(r.getCategorieCode())
                    .heureDebut(r.getHeureDebut())
                    .heureFin(r.getHeureFin())
                    .minutesNormales(r.getMinutesNormales())
                    .minutesSupplementaires(r.getMinutesSupplementaires())
                    .minutesAbsence(r.getMinutesAbsence())
                    .commentaire(r.getCommentaire())
                    .build();
            ligneRepository.save(ligne);
        });
    }
}