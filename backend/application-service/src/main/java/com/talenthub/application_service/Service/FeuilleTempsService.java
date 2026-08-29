// Service/FeuilleTempsService.java — COMPLET avec synchro Outlook
package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.FeuilleTempsDTO;
import com.talenthub.application_service.DTO.FeuilleTempsRequest;
import com.talenthub.application_service.DTO.LigneFeuilleTempsRequest;
import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Entity.FeuilleTemps;
import com.talenthub.application_service.Entity.LigneFeuilleTemps;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Enum.NotificationType;
import com.talenthub.application_service.Exception.DuplicateResourceException;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class FeuilleTempsService {

    private final FeuilleTempsRepository      repository;
    private final UtilisateurRepository       utilisateurRepository;
    private final LigneFeuilleTempsRepository ligneRepository;
    private final NotificationService         notificationService;
    private final ProfilPermissionRepository  profilPermissionRepository;
    private final ProjetRepository            projetRepository;
    private final ActiviteRepository          activiteRepository;
    private final ClientRepository            clientRepository;
    private final AvancementService           avancementService;
    private final ProjetService               projetService;
    private final OutlookSyncService          outlookSyncService; // ✅ NOUVEAU

    public FeuilleTempsService(
            FeuilleTempsRepository repository,
            UtilisateurRepository utilisateurRepository,
            LigneFeuilleTempsRepository ligneRepository,
            NotificationService notificationService,
            ProfilPermissionRepository profilPermissionRepository,
            ProjetRepository projetRepository,
            ActiviteRepository activiteRepository,
            ClientRepository clientRepository,
            AvancementService avancementService,
            ProjetService projetService,
            OutlookSyncService outlookSyncService) { // ✅ NOUVEAU
        this.repository                 = repository;
        this.utilisateurRepository      = utilisateurRepository;
        this.ligneRepository            = ligneRepository;
        this.notificationService        = notificationService;
        this.profilPermissionRepository = profilPermissionRepository;
        this.projetRepository           = projetRepository;
        this.activiteRepository        = activiteRepository;
        this.clientRepository          = clientRepository;
        this.avancementService         = avancementService;
        this.projetService             = projetService;
        this.outlookSyncService        = outlookSyncService; // ✅ NOUVEAU
    }

    public FeuilleTempsDTO toDTO(FeuilleTemps ft) {
        return new FeuilleTempsDTO(ft, projetRepository, activiteRepository, clientRepository);
    }

    // ── Lecture ──────────────────────────────────────────────────────────────
    public List<FeuilleTemps> getAllFeuillesTemps()            { return repository.findAll(); }
    public Optional<FeuilleTemps> getFeuilleTempsById(Long id) { return repository.findById(id); }
    public List<FeuilleTemps> getByStatut(String statut)       { return repository.findByStatut(statut); }
    public List<FeuilleTemps> getFeuillesSoumises()            { return repository.findByStatut("SOUMISE"); }
    public List<FeuilleTemps> getPourApprobation() {
        return repository.findByStatutIn(List.of("SOUMISE", "VALIDEE", "REJETEE"));
    }
    public List<FeuilleTemps> getByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurIdOrderBySemaineDuDesc(utilisateurId);
    }

    @Transactional(readOnly = true)
    public List<LigneFeuilleTemps> getActivitesRecentesDisponibles(Long utilisateurId) {
        List<LigneFeuilleTemps> toutes = ligneRepository.findRecentesByUtilisateurId(utilisateurId);

        Set<Long> projetsVisiblesIds = projetService
                .getVisiblesPourFeuilleTemps(utilisateurId)
                .stream().map(Projet::getId).collect(Collectors.toSet());

        List<LigneFeuilleTemps> filtrees = toutes.stream()
                .filter(l -> l.getProjetId() == null || projetsVisiblesIds.contains(l.getProjetId()))
                .toList();

        Map<String, LigneFeuilleTemps> dernierParCle = new LinkedHashMap<>();
        for (LigneFeuilleTemps l : filtrees) {
            String cle = (l.getProjetId() != null ? l.getProjetId() : "null")
                    + "-" + (l.getActiviteId() != null ? l.getActiviteId() : "null");
            LigneFeuilleTemps existante = dernierParCle.get(cle);
            if (existante == null || l.getDate().isAfter(existante.getDate())) {
                dernierParCle.put(cle, l);
            }
        }

        return dernierParCle.values().stream()
                .sorted(Comparator.comparing(LigneFeuilleTemps::getDate).reversed())
                .limit(5)
                .toList();
    }

    // ── Créer ─────────────────────────────────────────────────────────────────
    public FeuilleTemps create(FeuilleTempsRequest req) {
        Utilisateur utilisateur = utilisateurRepository.findById(req.getUtilisateurId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur non trouvé: " + req.getUtilisateurId()));

        LocalDate lundiSemaine = toLundi(req.getSemaineDu());
        repository.findByUtilisateurIdAndSemaineDu(req.getUtilisateurId(), lundiSemaine)
                .ifPresent(e -> { throw new DuplicateResourceException(
                        "Une feuille existe déjà pour cette semaine."); });

        int totalTravaillees = calculerTotalTravaillees(req);
        int totalSupp        = calculerTotalSupp(req);

        FeuilleTemps ft = FeuilleTemps.builder()
                .utilisateur(utilisateur)
                .semaineDu(lundiSemaine)
                .semaineAu(lundiSemaine.plusDays(4))
                .heuresTravaillees(totalTravaillees / 60.0)
                .heuresSupplementaires(totalSupp / 60.0)
                .heuresAbsence(0)
                .statut(req.getStatut() != null ? req.getStatut() : "BROUILLON")
                .commentaireEmploye(req.getCommentaireEmploye())
                .build();

        FeuilleTemps saved = repository.save(ft);
        if (req.getLignes() != null && !req.getLignes().isEmpty()) {
            saveLignes(saved, req.getLignes());
        }

        FeuilleTemps result = repository.findById(saved.getId()).orElse(saved);

        recalculerAvancementDeFeuille(result);

        return result;
    }

    // ── Modifier ──────────────────────────────────────────────────────────────
    public FeuilleTemps update(Long id, FeuilleTempsRequest req) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feuille non trouvée: " + id));

        if (!"BROUILLON".equals(ft.getStatut()) && !"REJETEE".equals(ft.getStatut())) {
            throw new RuntimeException(
                    "Seules les feuilles en brouillon ou rejetées peuvent être modifiées.");
        }

        int totalTravaillees = calculerTotalTravaillees(req);
        int totalSupp        = calculerTotalSupp(req);

        ft.setHeuresTravaillees(totalTravaillees / 60.0);
        ft.setHeuresSupplementaires(totalSupp / 60.0);
        if (req.getCommentaireEmploye() != null) {
            ft.setCommentaireEmploye(req.getCommentaireEmploye());
        }

        if (req.getLignes() != null) {
            // ✅ NOUVEAU — nettoyer les événements Outlook des lignes qui vont être supprimées
            List<LigneFeuilleTemps> anciennesLignes = ligneRepository.findByFeuilleTempsId(ft.getId());
            for (LigneFeuilleTemps l : anciennesLignes) {
                if (l.getOutlookEventId() != null) {
                    outlookSyncService.supprimerEvenement(ft.getUtilisateur().getId(), l.getOutlookEventId());
                }
            }

            ligneRepository.deleteByFeuilleTempsId(ft.getId());
            if (!req.getLignes().isEmpty()) {
                saveLignes(ft, req.getLignes());
            }
        }

        FeuilleTemps saved = repository.save(ft);
        FeuilleTemps result = repository.findById(saved.getId()).orElse(saved);

        recalculerAvancementDeFeuille(result);

        return result;
    }

    // ── Soumettre ─────────────────────────────────────────────────────────────
    public FeuilleTemps soumettre(Long id) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feuille non trouvée: " + id));

        if (!"BROUILLON".equals(ft.getStatut()) && !"REJETEE".equals(ft.getStatut()))
            throw new RuntimeException("Seules les feuilles en brouillon ou rejetées peuvent être soumises.");

        List<LigneFeuilleTemps> lignes = ligneRepository.findByFeuilleTempsId(id);
        if (lignes.isEmpty())
            throw new RuntimeException("Impossible de soumettre une feuille sans entrées.");

        ft.setStatut("SOUMISE");
        FeuilleTemps saved = repository.save(ft);
        notifierApprobateurs(saved);
        return saved;
    }

    // ── Annuler soumission ────────────────────────────────────────────────────
    public FeuilleTemps annulerSoumission(Long id) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feuille non trouvée: " + id));
        if (!"SOUMISE".equals(ft.getStatut()))
            throw new RuntimeException("Seules les feuilles soumises peuvent être annulées.");
        ft.setStatut("BROUILLON");
        ft.setCommentaireValideur(null);
        return repository.save(ft);
    }

    // ── Valider ───────────────────────────────────────────────────────────────
    public FeuilleTemps valider(Long id, String valideurKeycloakId, String commentaire) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feuille non trouvée: " + id));
        if (!"SOUMISE".equals(ft.getStatut()))
            throw new RuntimeException("Seules les feuilles soumises peuvent être validées.");

        ft.setStatut("VALIDEE");
        ft.setValidePar(valideurKeycloakId);
        ft.setDateValidation(LocalDateTime.now());
        ft.setCommentaireValideur(commentaire);
        FeuilleTemps saved = repository.save(ft);

        String kcId = saved.getUtilisateur().getKeycloakId();
        if (kcId != null) {
            notificationService.creer(kcId, NotificationType.FEUILLE_VALIDEE,
                    "Feuille validée ✅",
                    "Votre feuille du " + saved.getSemaineDu() + " a été validée." +
                            (commentaire != null && !commentaire.isBlank()
                                    ? " Commentaire : " + commentaire : ""),
                    "/feuille-temps", saved.getId());
        }
        return saved;
    }

    // ── Rejeter ───────────────────────────────────────────────────────────────
    public FeuilleTemps rejeter(Long id, String valideurKeycloakId, String commentaire) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feuille non trouvée: " + id));
        if (!"SOUMISE".equals(ft.getStatut()))
            throw new RuntimeException("Seules les feuilles soumises peuvent être rejetées.");
        if (commentaire == null || commentaire.isBlank())
            throw new RuntimeException("Un motif de rejet est obligatoire.");

        ft.setStatut("REJETEE");
        ft.setValidePar(valideurKeycloakId);
        ft.setDateValidation(LocalDateTime.now());
        ft.setCommentaireValideur(commentaire);
        FeuilleTemps saved = repository.save(ft);

        String kcId = saved.getUtilisateur().getKeycloakId();
        if (kcId != null) {
            notificationService.creer(kcId, NotificationType.FEUILLE_REJETEE,
                    "Feuille rejetée ❌",
                    "Votre feuille du " + saved.getSemaineDu() +
                            " a été rejetée. Motif : " + commentaire,
                    "/feuille-temps", saved.getId());
        }
        return saved;
    }

    // ── Supprimer ─────────────────────────────────────────────────────────────
    public void delete(Long id) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feuille non trouvée: " + id));
        if (!"BROUILLON".equals(ft.getStatut()) && !"REJETEE".equals(ft.getStatut()))
            throw new RuntimeException("Seules les feuilles en brouillon ou rejetées peuvent être supprimées.");

        Set<Long> projetIds   = new HashSet<>(ligneRepository.findDistinctProjetIdsByFeuilleTempsId(id));
        Set<Long> activiteIds = new HashSet<>(ligneRepository.findDistinctActiviteIdsByFeuilleTempsId(id));

        // ✅ NOUVEAU — nettoyer les événements Outlook des lignes avant suppression
        List<LigneFeuilleTemps> lignes = ligneRepository.findByFeuilleTempsId(id);
        for (LigneFeuilleTemps l : lignes) {
            if (l.getOutlookEventId() != null) {
                outlookSyncService.supprimerEvenement(ft.getUtilisateur().getId(), l.getOutlookEventId());
            }
        }

        ligneRepository.deleteByFeuilleTempsId(id);
        repository.deleteById(id);

        avancementService.recalculer(projetIds, activiteIds);
    }

    // ── saveLignes — IDs uniquement + synchro Outlook ─────────────────────────
    private void saveLignes(FeuilleTemps ft, List<LigneFeuilleTempsRequest> reqs) {
        reqs.forEach(r -> {
            int minutes = r.getMinutesTravaillees();

            if (minutes == 0 && r.getHeureDebut() != null && r.getHeureFin() != null
                    && !r.getHeureDebut().isBlank() && !r.getHeureFin().isBlank()) {
                try {
                    String[] d = r.getHeureDebut().split(":");
                    String[] f = r.getHeureFin().split(":");
                    int totalMin = (Integer.parseInt(f[0]) * 60 + Integer.parseInt(f[1]))
                            - (Integer.parseInt(d[0]) * 60 + Integer.parseInt(d[1]));
                    if (totalMin > 0) minutes = totalMin;
                } catch (Exception ignored) {}
            }

            String categorieCode = "PROJET";
            if (r.getProjetId() == null && r.getActiviteId() != null) categorieCode = "ACTIVITE";
            else if (r.getProjetId() == null && r.getActiviteId() == null) categorieCode = "AUTRE";

            LigneFeuilleTemps ligne = LigneFeuilleTemps.builder()
                    .feuilleTemps(ft)
                    .date(r.getDate())
                    .categorieCode(categorieCode)
                    .projetId(r.getProjetId())
                    .activiteId(r.getActiviteId())
                    .clientId(r.getClientId())
                    .heureDebut(r.getHeureDebut())
                    .heureFin(r.getHeureFin())
                    .minutesTravaillees(minutes)
                    .minutesSupplementaires(r.getMinutesSupplementaires())
                    .commentaire(r.getCommentaire())
                    .estWeekend(r.isEstWeekend())
                    .build();

            LigneFeuilleTemps saved = ligneRepository.save(ligne);

            if (r.getActiviteId() != null) {
                assignerUtilisateurActivite(ft.getUtilisateur().getId(), r.getActiviteId());
            }

            // ✅ NOUVEAU — synchronisation Outlook si un projet ou une activité
            // est renseigné et que des heures de début/fin existent
            if ((r.getProjetId() != null || r.getActiviteId() != null)
                    && r.getHeureDebut() != null && r.getHeureFin() != null
                    && !r.getHeureDebut().isBlank() && !r.getHeureFin().isBlank()) {
                try {
                    String titre = r.getProjetId() != null
                            ? projetRepository.findById(r.getProjetId()).map(Projet::getNom).orElse("Projet")
                            : activiteRepository.findById(r.getActiviteId()).map(Activité::getNom).orElse("Activité");

                    String outlookId = outlookSyncService.syncEvenement(
                            ft.getUtilisateur().getId(),
                            saved.getOutlookEventId(),
                            titre,
                            r.getCommentaire(),
                            r.getDate(),
                            r.getHeureDebut(),
                            r.getHeureFin(),
                            null
                    );
                    saved.setOutlookEventId(outlookId);
                    ligneRepository.save(saved);
                } catch (Exception e) {
                    // Non bloquant — la feuille de temps se sauvegarde même si Outlook échoue
                }
            }
        });
    }

    private void assignerUtilisateurActivite(Long utilisateurId, Long activiteId) {
        try {
            Activité activite = activiteRepository.findById(activiteId).orElse(null);
            if (activite == null) return;

            boolean dejaAssigne = activite.getUtilisateurs().stream()
                    .anyMatch(u -> u.getId().equals(utilisateurId));

            if (!dejaAssigne) {
                utilisateurRepository.findById(utilisateurId).ifPresent(user -> {
                    activite.getUtilisateurs().add(user);
                    activiteRepository.save(activite);
                });
            }
        } catch (Exception e) {
            // Non bloquant
        }
    }

    private void recalculerAvancementDeFeuille(FeuilleTemps ft) {
        try {
            Set<Long> projetIds   = new HashSet<>(
                    ligneRepository.findDistinctProjetIdsByFeuilleTempsId(ft.getId()));
            Set<Long> activiteIds = new HashSet<>(
                    ligneRepository.findDistinctActiviteIdsByFeuilleTempsId(ft.getId()));
            avancementService.recalculer(projetIds, activiteIds);
        } catch (Exception e) {
            // Non bloquant
        }
    }

    // ── Helpers privés ────────────────────────────────────────────────────────
    private LocalDate toLundi(LocalDate date) {
        if (date == null) return LocalDate.now();
        int dayOfWeek = date.getDayOfWeek().getValue();
        return date.minusDays(dayOfWeek - 1);
    }

    private int calculerTotalTravaillees(FeuilleTempsRequest req) {
        if (req.getLignes() != null && !req.getLignes().isEmpty()) {
            return req.getLignes().stream()
                    .mapToInt(LigneFeuilleTempsRequest::getMinutesTravaillees).sum();
        }
        Integer val = req.getMinutesTravaillees();
        return val != null ? val : 0;
    }

    private int calculerTotalSupp(FeuilleTempsRequest req) {
        if (req.getLignes() != null && !req.getLignes().isEmpty()) {
            return req.getLignes().stream()
                    .mapToInt(LigneFeuilleTempsRequest::getMinutesSupplementaires).sum();
        }
        Integer val = req.getMinutesSupplementaires();
        return val != null ? val : 0;
    }

    private void notifierApprobateurs(FeuilleTemps ft) {
        utilisateurRepository.findAll().stream()
                .filter(u -> u.getProfil() != null && u.getKeycloakId() != null)
                .filter(u -> !u.getKeycloakId().equals(ft.getUtilisateur().getKeycloakId()))
                .forEach(u -> {
                    boolean aPermission = profilPermissionRepository
                            .findByProfilId(u.getProfil().getId()).stream()
                            .anyMatch(pp -> pp.getPermission() != null
                                    && "TS_VALIDATE".equals(pp.getPermission().getCode()));
                    if (aPermission) {
                        notificationService.creer(
                                u.getKeycloakId(), NotificationType.FEUILLE_SOUMISE,
                                "Nouvelle feuille soumise 📋",
                                ft.getUtilisateur().getNomComplet()
                                        + " a soumis sa feuille de la semaine du "
                                        + ft.getSemaineDu(),
                                "/approbations-ft", ft.getId());
                    }
                });
    }
}