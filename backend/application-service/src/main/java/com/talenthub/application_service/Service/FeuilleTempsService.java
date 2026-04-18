// src/main/java/com/talenthub/application_service/Service/FeuilleTempsService.java
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

    private final FeuilleTempsRepository       repository;
    private final UtilisateurRepository        utilisateurRepository;
    private final LigneFeuilleTempsRepository  ligneRepository;
    private final NotificationService          notificationService;
    private final ProfilPermissionRepository   profilPermissionRepository;

    public FeuilleTempsService(
            FeuilleTempsRepository repository,
            UtilisateurRepository utilisateurRepository,
            LigneFeuilleTempsRepository ligneRepository,
            NotificationService notificationService,
            ProfilPermissionRepository profilPermissionRepository) {
        this.repository                 = repository;
        this.utilisateurRepository      = utilisateurRepository;
        this.ligneRepository            = ligneRepository;
        this.notificationService        = notificationService;
        this.profilPermissionRepository = profilPermissionRepository;
    }

    // ── Lecture ──
    public List<FeuilleTemps> getAllFeuillesTemps() { return repository.findAll(); }

    public Optional<FeuilleTemps> getFeuilleTempsById(Long id) { return repository.findById(id); }

    public List<FeuilleTemps> getByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurIdOrderBySemaineDuDesc(utilisateurId);
    }

    public List<FeuilleTemps> getByStatut(String statut) { return repository.findByStatut(statut); }

    public List<FeuilleTemps> getFeuillesSoumises() { return repository.findByStatut("SOUMISE"); }

    public List<FeuilleTemps> getPourApprobation() {
        return repository.findByStatutIn(List.of("SOUMISE", "VALIDEE", "REJETEE"));
    }

    // ── Créer ──
    public FeuilleTemps create(FeuilleTempsRequest req) {
        Utilisateur utilisateur = utilisateurRepository.findById(req.getUtilisateurId())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + req.getUtilisateurId()));

        repository.findByUtilisateurIdAndSemaineDu(req.getUtilisateurId(), req.getSemaineDu())
                .ifPresent(e -> { throw new DuplicateResourceException("Une feuille existe déjà pour cette semaine."); });

        // Calculer les totaux depuis les lignes si non fournis
        int totalTravaillees = req.getMinutesTravaillees();
        int totalSupp        = req.getMinutesSupplementaires();
        if (req.getLignes() != null && !req.getLignes().isEmpty()) {
            totalTravaillees = req.getLignes().stream().mapToInt(LigneFeuilleTempsRequest::getMinutesTravaillees).sum();
            totalSupp        = req.getLignes().stream().mapToInt(LigneFeuilleTempsRequest::getMinutesSupplementaires).sum();
        }

        FeuilleTemps ft = FeuilleTemps.builder()
                .utilisateur(utilisateur)
                .semaineDu(req.getSemaineDu())
                .semaineAu(req.getSemaineAu())
                .heuresTravaillees(totalTravaillees / 60.0)
                .heuresSupplementaires(totalSupp / 60.0)
                .heuresAbsence(0)
                .statut(req.getStatut() != null ? req.getStatut() : "BROUILLON")
                .commentaireEmploye(req.getCommentaireEmploye())
                .build();

        FeuilleTemps saved = repository.save(ft);
        if (req.getLignes() != null) saveLignes(saved, req.getLignes());
        return saved;
    }

    // ── Modifier ──
    public FeuilleTemps update(Long id, FeuilleTempsRequest req) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feuille non trouvée: " + id));

        if (!"BROUILLON".equals(ft.getStatut()) && !"REJETEE".equals(ft.getStatut())) {
            throw new RuntimeException("Seules les feuilles en brouillon ou rejetées peuvent être modifiées.");
        }

        int totalTravaillees = req.getMinutesTravaillees();
        int totalSupp        = req.getMinutesSupplementaires();
        if (req.getLignes() != null && !req.getLignes().isEmpty()) {
            totalTravaillees = req.getLignes().stream().mapToInt(LigneFeuilleTempsRequest::getMinutesTravaillees).sum();
            totalSupp        = req.getLignes().stream().mapToInt(LigneFeuilleTempsRequest::getMinutesSupplementaires).sum();
        }

        ft.setSemaineDu(req.getSemaineDu());
        ft.setSemaineAu(req.getSemaineAu());
        ft.setHeuresTravaillees(totalTravaillees / 60.0);
        ft.setHeuresSupplementaires(totalSupp / 60.0);
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

    // ── Annuler soumission ──
    public FeuilleTemps annulerSoumission(Long id) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feuille non trouvée: " + id));
        if (!"SOUMISE".equals(ft.getStatut()))
            throw new RuntimeException("Seules les feuilles soumises peuvent être annulées.");
        ft.setStatut("BROUILLON");
        ft.setCommentaireValideur(null);
        return repository.save(ft);
    }

    // ── Valider ──
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

    // ── Rejeter ──
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

    // ── Supprimer ──
    public void delete(Long id) {
        FeuilleTemps ft = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feuille non trouvée: " + id));
        if (!"BROUILLON".equals(ft.getStatut()) && !"REJETEE".equals(ft.getStatut()))
            throw new RuntimeException("Seules les feuilles en brouillon ou rejetées peuvent être supprimées.");
        ligneRepository.deleteByFeuilleTempsId(id);
        repository.deleteById(id);
    }

    // ── Enregistrer les lignes ──
    private void saveLignes(FeuilleTemps ft, List<LigneFeuilleTempsRequest> reqs) {
        reqs.forEach(r -> {
            // Calculer les minutes depuis heureDebut/heureFin si non fournies
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

            LigneFeuilleTemps ligne = LigneFeuilleTemps.builder()
                    .feuilleTemps(ft)
                    .date(r.getDate())
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

    private void notifierApprobateurs(FeuilleTemps ft) {
        utilisateurRepository.findAll().stream()
                .filter(u -> u.getProfil() != null && u.getKeycloakId() != null)
                .filter(u -> !u.getKeycloakId().equals(ft.getUtilisateur().getKeycloakId()))
                .forEach(u -> {
                    boolean aPermission = profilPermissionRepository.findByProfilId(u.getProfil().getId())
                            .stream().anyMatch(pp -> pp.getPermission() != null &&
                                    "Traiter les feuilles de temps".equals(pp.getPermission().getLibelle()) &&
                                    pp.isCanWrite());
                    if (aPermission) {
                        notificationService.creer(u.getKeycloakId(), NotificationType.FEUILLE_SOUMISE,
                                "Nouvelle feuille soumise 📋",
                                ft.getUtilisateur().getNomComplet() + " a soumis sa feuille de la semaine du " + ft.getSemaineDu(),
                                "/approbations-ft", ft.getId());
                    }
                });
    }
}