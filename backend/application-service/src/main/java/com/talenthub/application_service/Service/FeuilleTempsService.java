// src/main/java/com/talenthub/application_service/Service/FeuilleTempsService.java
// ✅ FIX : saveLignes() inclut categorieCode = "PROJET" par défaut
package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.FeuilleTempsRequest;
import com.talenthub.application_service.DTO.LigneFeuilleTempsRequest;
import com.talenthub.application_service.Entity.FeuilleTemps;
import com.talenthub.application_service.Entity.LigneFeuilleTemps;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Enum.NotificationType;
import com.talenthub.application_service.Exception.DuplicateResourceException;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.FeuilleTempsRepository;
import com.talenthub.application_service.Repository.LigneFeuilleTempsRepository;
import com.talenthub.application_service.Repository.ProfilPermissionRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class FeuilleTempsService {

    private final FeuilleTempsRepository      repository;
    private final UtilisateurRepository       utilisateurRepository;
    private final LigneFeuilleTempsRepository ligneRepository;
    private final NotificationService         notificationService;
    private final ProfilPermissionRepository  profilPermissionRepository;

    public FeuilleTempsService(
            FeuilleTempsRepository repository,
            UtilisateurRepository utilisateurRepository,
            LigneFeuilleTempsRepository ligneRepository,
            NotificationService notificationService,
            ProfilPermissionRepository profilPermissionRepository) {
        this.repository                = repository;
        this.utilisateurRepository     = utilisateurRepository;
        this.ligneRepository           = ligneRepository;
        this.notificationService       = notificationService;
        this.profilPermissionRepository = profilPermissionRepository;
    }

    public List<FeuilleTemps> getAllFeuillesTemps()              { return repository.findAll(); }
    public Optional<FeuilleTemps> getFeuilleTempsById(Long id)  { return repository.findById(id); }
    public List<FeuilleTemps> getByStatut(String statut)        { return repository.findByStatut(statut); }
    public List<FeuilleTemps> getFeuillesSoumises()             { return repository.findByStatut("SOUMISE"); }
    public List<FeuilleTemps> getPourApprobation()              { return repository.findByStatutIn(List.of("SOUMISE","VALIDEE","REJETEE")); }

    public List<FeuilleTemps> getByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurIdOrderBySemaineDuDesc(utilisateurId);
    }

    // ─── Créer ───────────────────────────────────────────────────────────────
    public FeuilleTemps create(FeuilleTempsRequest req) {
        Utilisateur utilisateur = utilisateurRepository.findById(req.getUtilisateurId())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + req.getUtilisateurId()));

        LocalDate lundiSemaine = toLundi(req.getSemaineDu());
        repository.findByUtilisateurIdAndSemaineDu(req.getUtilisateurId(), lundiSemaine)
                .ifPresent(e -> { throw new DuplicateResourceException("Une feuille existe déjà pour cette semaine."); });

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
        return repository.findById(saved.getId()).orElse(saved);
    }

    // ─── Modifier ────────────────────────────────────────────────────────────
    public FeuilleTemps update(Long id, FeuilleTempsRequest req) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feuille non trouvée: " + id));

        if (!"BROUILLON".equals(ft.getStatut()) && !"REJETEE".equals(ft.getStatut())) {
            throw new RuntimeException("Seules les feuilles en brouillon ou rejetées peuvent être modifiées.");
        }

        // ✅ FIX : semaineDu/semaineAu ne changent JAMAIS lors d'un update
        int totalTravaillees = calculerTotalTravaillees(req);
        int totalSupp        = calculerTotalSupp(req);

        ft.setHeuresTravaillees(totalTravaillees / 60.0);
        ft.setHeuresSupplementaires(totalSupp / 60.0);
        if (req.getCommentaireEmploye() != null) {
            ft.setCommentaireEmploye(req.getCommentaireEmploye());
        }

        if (req.getLignes() != null) {
            ligneRepository.deleteByFeuilleTempsId(ft.getId());
            if (!req.getLignes().isEmpty()) {
                saveLignes(ft, req.getLignes());
            }
        }

        FeuilleTemps saved = repository.save(ft);
        return repository.findById(saved.getId()).orElse(saved);
    }

    // ─── Soumettre ───────────────────────────────────────────────────────────
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

    // ─── Annuler soumission ──────────────────────────────────────────────────
    public FeuilleTemps annulerSoumission(Long id) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feuille non trouvée: " + id));
        if (!"SOUMISE".equals(ft.getStatut()))
            throw new RuntimeException("Seules les feuilles soumises peuvent être annulées.");
        ft.setStatut("BROUILLON");
        ft.setCommentaireValideur(null);
        return repository.save(ft);
    }

    // ─── Valider ─────────────────────────────────────────────────────────────
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
                            (commentaire != null && !commentaire.isBlank() ? " Commentaire : " + commentaire : ""),
                    "/feuille-temps", saved.getId());
        }
        return saved;
    }

    // ─── Rejeter ─────────────────────────────────────────────────────────────
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
                    "Votre feuille du " + saved.getSemaineDu() + " a été rejetée. Motif : " + commentaire,
                    "/feuille-temps", saved.getId());
        }
        return saved;
    }

    // ─── Supprimer ───────────────────────────────────────────────────────────
    public void delete(Long id) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feuille non trouvée: " + id));
        if (!"BROUILLON".equals(ft.getStatut()) && !"REJETEE".equals(ft.getStatut()))
            throw new RuntimeException("Seules les feuilles en brouillon ou rejetées peuvent être supprimées.");
        ligneRepository.deleteByFeuilleTempsId(id);
        repository.deleteById(id);
    }

    // ─── Helpers privés ──────────────────────────────────────────────────────

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
        return req.getMinutesTravaillees();
    }

    private int calculerTotalSupp(FeuilleTempsRequest req) {
        if (req.getLignes() != null && !req.getLignes().isEmpty()) {
            return req.getLignes().stream()
                    .mapToInt(LigneFeuilleTempsRequest::getMinutesSupplementaires).sum();
        }
        return req.getMinutesSupplementaires();
    }

    // ✅ FIX CRITIQUE : categorieCode mis à "PROJET" par défaut
    // pour éviter la violation NOT NULL de l'ancienne colonne
    private void saveLignes(FeuilleTemps ft, List<LigneFeuilleTempsRequest> reqs) {
        reqs.forEach(r -> {
            int minutes = r.getMinutesTravaillees();
            // Calculer depuis heureDebut/heureFin si minutes non fournies
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

            // ✅ Déduire categorieCode depuis les données disponibles
            String categorieCode = "PROJET";
            if (r.getProjetId() == null && r.getActiviteId() != null) {
                categorieCode = "ACTIVITE";
            } else if (r.getProjetId() == null && r.getActiviteId() == null) {
                categorieCode = "AUTRE";
            }

            LigneFeuilleTemps ligne = LigneFeuilleTemps.builder()
                    .feuilleTemps(ft)
                    .date(r.getDate())
                    .categorieCode(categorieCode)   // ✅ TOUJOURS fourni
                    .projetId(r.getProjetId())
                    .projetNom(r.getProjetNom())
                    .activiteId(r.getActiviteId())
                    .activiteNom(r.getActiviteNom())
                    .clientId(r.getClientId())
                    .clientNom(r.getClientNom())
                    .heureDebut(r.getHeureDebut())
                    .heureFin(r.getHeureFin())
                    .minutesTravaillees(minutes)
                    .minutesSupplementaires(r.getMinutesSupplementaires())
                    .commentaire(r.getCommentaire())
                    .estWeekend(r.isEstWeekend())
                    .build();
            ligneRepository.save(ligne);
        });
    }








    // Remplace uniquement la méthode notifierApprobateurs()
// Le problème : isCanWrite() n'existe plus → vérifier par code de permission

    private void notifierApprobateurs(FeuilleTemps ft) {
        utilisateurRepository.findAll().stream()
                .filter(u -> u.getProfil() != null && u.getKeycloakId() != null)
                .filter(u -> !u.getKeycloakId().equals(ft.getUtilisateur().getKeycloakId()))
                .forEach(u -> {
                    // ✅ FIX : plus de isCanWrite() — vérifier par code de permission
                    boolean aPermission = profilPermissionRepository
                            .findByProfilId(u.getProfil().getId())
                            .stream()
                            .anyMatch(pp -> pp.getPermission() != null
                                    && "FT_APPROVE".equals(pp.getPermission().getCode()));
                    // OU si tu veux par libellé :
                    // && "Traiter les feuilles de temps".equals(pp.getPermission().getLibelle())

                    if (aPermission) {
                        notificationService.creer(
                                u.getKeycloakId(),
                                NotificationType.FEUILLE_SOUMISE,
                                "Nouvelle feuille soumise 📋",
                                ft.getUtilisateur().getNomComplet()
                                        + " a soumis sa feuille de la semaine du " + ft.getSemaineDu(),
                                "/approbations-ft",
                                ft.getId()
                        );
                    }
                });
    }







}