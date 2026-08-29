package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.DemandeRequest;
import com.talenthub.application_service.DTO.SoldeCongeDTO;
import com.talenthub.application_service.Entity.Demande;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Enum.NotificationType;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Exception.SoldeInsuffisantException;
import com.talenthub.application_service.Repository.DemandeRepository;
import com.talenthub.application_service.Repository.ProfilPermissionRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional
public class DemandeService {

    private final DemandeRepository          repository;
    private final UtilisateurRepository      utilisateurRepository;
    private final NotificationService        notificationService;
    private final ProfilPermissionRepository profilPermRepo;
    private final CongeService               congeService;
    private final OutlookSyncService         outlookSyncService; // ✅ NOUVEAU

    public DemandeService(DemandeRepository repository,
                          UtilisateurRepository utilisateurRepository,
                          NotificationService notificationService,
                          ProfilPermissionRepository profilPermRepo,
                          CongeService congeService,
                          OutlookSyncService outlookSyncService) { // ✅ NOUVEAU
        this.repository            = repository;
        this.utilisateurRepository = utilisateurRepository;
        this.notificationService   = notificationService;
        this.profilPermRepo        = profilPermRepo;
        this.congeService          = congeService;
        this.outlookSyncService    = outlookSyncService; // ✅ NOUVEAU
    }

    public List<Demande> getAll() { return repository.findAll(); }
    public Optional<Demande> getById(Long id) { return repository.findById(id); }

    public List<Demande> getByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurIdOrderByDateCreationDesc(utilisateurId);
    }

    public List<Demande> getByKeycloakId(String keycloakId) {
        return utilisateurRepository.findByKeycloakId(keycloakId)
                .map(u -> repository.findByUtilisateurIdOrderByDateCreationDesc(u.getId()))
                .orElse(List.of());
    }

    public boolean isOwner(Long demandeId, String keycloakId) {
        return repository.findById(demandeId)
                .map(d -> d.getUtilisateur() != null
                        && keycloakId.equals(d.getUtilisateur().getKeycloakId()))
                .orElse(false);
    }

    public Demande create(DemandeRequest req) {
        Utilisateur utilisateur = utilisateurRepository.findById(req.getUtilisateurId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur non trouvé: " + req.getUtilisateurId()));

        Integer nbJours = req.getNbJours();
        if (nbJours == null && req.getDateDebut() != null && req.getDateFin() != null) {
            nbJours = (int)(req.getDateDebut().until(req.getDateFin()).getDays() + 1);
        }

        verifierSoldeDisponible(req.getTypeDemandeId(), req.getUtilisateurId(), nbJours, null);

        Demande d = Demande.builder()
                .utilisateur(utilisateur)
                .typeDemandeId(req.getTypeDemandeId())
                .statutDemandeId(req.getStatutDemandeId() != null ? req.getStatutDemandeId() : 1L)
                .sujet(req.getSujet())
                .description(req.getDescription())
                .dateDebut(req.getDateDebut())
                .dateFin(req.getDateFin())
                .nbJours(nbJours)
                .pieceJointeUrl(req.getPieceJointeUrl())
                .build();

        Demande saved = repository.save(d);

        notifierApprobateurs(saved, utilisateur);

        return saved;
    }

    public Demande update(Long id, DemandeRequest req) {
        Demande d = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande non trouvée: " + id));

        verifierSoldeDisponible(req.getTypeDemandeId(), d.getUtilisateur().getId(),
                req.getNbJours(), d.getNbJours());

        d.setSujet(req.getSujet());
        d.setDescription(req.getDescription());
        d.setDateDebut(req.getDateDebut());
        d.setDateFin(req.getDateFin());
        d.setNbJours(req.getNbJours());
        d.setTypeDemandeId(req.getTypeDemandeId());
        if (req.getStatutDemandeId() != null) d.setStatutDemandeId(req.getStatutDemandeId());

        return repository.save(d);
    }

    private void verifierSoldeDisponible(Long typeDemandeId, Long utilisateurId,
                                         Integer nbJoursDemande, Integer nbJoursAncienne) {
        if (nbJoursDemande == null || nbJoursDemande <= 0) return;
        if (!congeService.estTypeConge(typeDemandeId)) return;

        SoldeCongeDTO solde = congeService.calculerSolde(utilisateurId);
        double soldeDisponible = solde.getSolde() + (nbJoursAncienne != null ? nbJoursAncienne : 0);

        if (nbJoursDemande > soldeDisponible) {
            throw new SoldeInsuffisantException(String.format(
                    "Solde insuffisant : %d jour(s) demandé(s) pour %.1f jour(s) disponible(s).",
                    nbJoursDemande, soldeDisponible
            ));
        }
    }

    public Demande traiter(Long id, Long statutId, String traitePar,
                           String commentaireRH, String statutCode) {
        Demande d = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande non trouvée: " + id));

        d.setStatutDemandeId(statutId);
        d.setTraitePar(traitePar);
        d.setCommentaireRH(commentaireRH);
        d.setDateTraitement(LocalDateTime.now());
        Demande saved = repository.save(d);

        notifierDemandeur(saved, statutCode);

        // ✅ NOUVEAU — synchronisation Outlook pour TOUTE demande acceptée
        // avec des dates renseignées (congé, formation, télétravail...),
        // aucun filtre par type de demande.
        if ("ACCEPTEE".equalsIgnoreCase(statutCode)
                && saved.getDateDebut() != null
                && saved.getUtilisateur() != null) {

            LocalDate dateFinExclusive = (saved.getDateFin() != null
                    ? saved.getDateFin() : saved.getDateDebut()).plusDays(1);

            String outlookId = outlookSyncService.syncEvenementToutJour(
                    saved.getUtilisateur().getId(),
                    saved.getOutlookEventId(),
                    saved.getSujet(),
                    saved.getDateDebut(),
                    dateFinExclusive
            );
            saved.setOutlookEventId(outlookId);
            repository.save(saved);
        }

        // ✅ NOUVEAU — si la demande n'est plus acceptée (rejetée après coup,
        // ou modifiée), retirer l'événement Outlook déjà créé
        if (!"ACCEPTEE".equalsIgnoreCase(statutCode) && saved.getOutlookEventId() != null) {
            outlookSyncService.supprimerEvenement(
                    saved.getUtilisateur().getId(), saved.getOutlookEventId());
            saved.setOutlookEventId(null);
            repository.save(saved);
        }

        return saved;
    }

    private void notifierDemandeur(Demande demande, String statutCode) {
        if (demande.getUtilisateur() == null) return;
        String keycloakId = demande.getUtilisateur().getKeycloakId();
        if (keycloakId == null) return;

        boolean estAcceptee = "ACCEPTEE".equalsIgnoreCase(statutCode);
        boolean estRejetee  = "REJETEE".equalsIgnoreCase(statutCode);

        if (estAcceptee) {
            notificationService.creer(
                    keycloakId,
                    NotificationType.DEMANDE_VALIDEE,
                    "Demande acceptée ✅",
                    "Votre demande \"" + demande.getSujet() + "\" a été acceptée." +
                            (demande.getCommentaireRH() != null && !demande.getCommentaireRH().isBlank()
                                    ? " Commentaire : " + demande.getCommentaireRH() : ""),
                    "/Demande",
                    demande.getId()
            );
        } else if (estRejetee) {
            notificationService.creer(
                    keycloakId,
                    NotificationType.DEMANDE_REJETEE,
                    "Demande rejetée ❌",
                    "Votre demande \"" + demande.getSujet() + "\" a été rejetée." +
                            (demande.getCommentaireRH() != null && !demande.getCommentaireRH().isBlank()
                                    ? " Motif : " + demande.getCommentaireRH() : ""),
                    "/Demande",
                    demande.getId()
            );
        }
    }

    public void delete(Long id) {
        Demande d = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande non trouvée: " + id));

        // ✅ NOUVEAU — nettoyage Outlook si la demande supprimée avait un événement synchronisé
        if (d.getOutlookEventId() != null && d.getUtilisateur() != null) {
            outlookSyncService.supprimerEvenement(d.getUtilisateur().getId(), d.getOutlookEventId());
        }

        repository.deleteById(id);
    }

    private void notifierApprobateurs(Demande demande, Utilisateur demandeur) {
        utilisateurRepository.findAll().stream()
                .filter(u -> u.getProfil() != null && u.getKeycloakId() != null)
                .filter(u -> !u.getId().equals(demandeur.getId()))
                .filter(u -> userHasPermission(u, "DEMANDE_APPROVE"))
                .forEach(u -> notificationService.creer(
                        u.getKeycloakId(),
                        NotificationType.DEMANDE_SOUMISE,
                        "Nouvelle demande soumise 📋",
                        demandeur.getNomComplet() + " a soumis : \"" + demande.getSujet() + "\"",
                        "/admin/demandes",
                        demande.getId()
                ));
    }

    private boolean userHasPermission(Utilisateur u, String permCode) {
        return profilPermRepo.findPermissionCodesByProfilId(u.getProfil().getId())
                .contains(permCode);
    }
}