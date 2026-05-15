// application-service/.../Service/ReclamationService.java
package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.ReclamationRequest;
import com.talenthub.application_service.Entity.*;
import com.talenthub.application_service.Enum.NotificationType;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ReclamationService {

    private final ReclamationRepository          repository;
    private final UtilisateurRepository          utilisateurRepo;
    private final NotificationService            notificationService;
    private final ProfilPermissionRepository     profilPermRepo;

    public ReclamationService(ReclamationRepository repository,
                              UtilisateurRepository utilisateurRepo,
                              NotificationService notificationService,
                              ProfilPermissionRepository profilPermRepo) {
        this.repository          = repository;
        this.utilisateurRepo     = utilisateurRepo;
        this.notificationService = notificationService;
        this.profilPermRepo      = profilPermRepo;
    }

    public List<Reclamation> getAll() {
        return repository.findAllByOrderByDateCreationDesc();
    }

    public Optional<Reclamation> getById(Long id) {
        return repository.findById(id);
    }

    public List<Reclamation> getByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurIdOrderByDateCreationDesc(utilisateurId);
    }

    public List<Reclamation> getByKeycloakId(String keycloakId) {
        return utilisateurRepo.findByKeycloakId(keycloakId)
                .map(u -> repository.findByUtilisateurIdOrderByDateCreationDesc(u.getId()))
                .orElse(List.of());
    }

    public boolean isOwner(Long reclamationId, String keycloakId) {
        return repository.findById(reclamationId)
                .map(r -> r.getUtilisateur() != null
                        && keycloakId.equals(r.getUtilisateur().getKeycloakId()))
                .orElse(false);
    }

    public Reclamation create(ReclamationRequest req) {
        Utilisateur utilisateur = utilisateurRepo.findById(req.getUtilisateurId())
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + req.getUtilisateurId()));

        // Statut par défaut = 1 (En attente) si non fourni
        Long statutId = req.getStatutReclamationId() != null ? req.getStatutReclamationId() : 1L;

        Reclamation r = Reclamation.builder()
                .utilisateur(utilisateur)
                .serviceReclamationId(req.getServiceReclamationId())
                .statutReclamationId(statutId)
                .sujet(req.getSujet())
                .description(req.getDescription())
                .pieceJointeUrl(req.getPieceJointeUrl())
                .build();

        Reclamation saved = repository.save(r);

        // Notifier les agents ayant RECLAMATION_TREAT
        notifierAgents(saved, utilisateur);

        return saved;
    }

    public Reclamation update(Long id, ReclamationRequest req) {
        Reclamation r = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée: " + id));
        r.setSujet(req.getSujet());
        r.setDescription(req.getDescription());
        r.setServiceReclamationId(req.getServiceReclamationId());
        if (req.getPieceJointeUrl() != null) r.setPieceJointeUrl(req.getPieceJointeUrl());
        return repository.save(r);
    }

    /** Traiter une réclamation (changer statut + commentaire) */
    public Reclamation traiter(Long id, Long statutId, String traitePar,
                               String commentaire, String statutCode) {
        Reclamation r = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée: " + id));
        r.setStatutReclamationId(statutId);
        r.setTraitePar(traitePar);
        r.setCommentaireTraitement(commentaire);
        r.setDateTraitement(LocalDateTime.now());
        Reclamation saved = repository.save(r);
        // Notifier le demandeur
        notifierDemandeur(saved, statutCode);
        return saved;
    }

    /** Ajouter un commentaire à la conversation */
    public Reclamation ajouterCommentaire(Long reclamationId,
                                          String contenu,
                                          String auteurKeycloakId,
                                          String auteurNom,
                                          boolean estAdmin) {
        Reclamation r = repository.findById(reclamationId)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée: " + reclamationId));

        CommentaireReclamation comment = CommentaireReclamation.builder()
                .reclamation(r)
                .auteurKeycloakId(auteurKeycloakId)
                .auteurNom(auteurNom)
                .estAdmin(estAdmin)
                .contenu(contenu)
                .build();

        r.getCommentaires().add(comment);
        Reclamation saved = repository.save(r);

        // Notifier l'autre partie
        if (estAdmin && r.getUtilisateur() != null && r.getUtilisateur().getKeycloakId() != null) {
            notificationService.creer(
                    r.getUtilisateur().getKeycloakId(),
                    NotificationType.RECLAMATION_COMMENTEE,
                    "Nouveau commentaire sur votre réclamation",
                    auteurNom + " a commenté votre réclamation \"" + r.getSujet() + "\".",
                    "/reclamations",
                    r.getId()
            );
        } else if (!estAdmin) {
            // Notifier les agents
            notifierAgentsCommentaire(saved, auteurNom);
        }
        return saved;
    }

    public void delete(Long id) {
        if (!repository.existsById(id))
            throw new ResourceNotFoundException("Réclamation non trouvée: " + id);
        repository.deleteById(id);
    }

    // ── Notifications ──────────────────────────────────────────────────────

    private void notifierAgents(Reclamation r, Utilisateur demandeur) {
        utilisateurRepo.findAll().stream()
                .filter(u -> u.getProfil() != null && u.getKeycloakId() != null)
                .filter(u -> !u.getId().equals(demandeur.getId()))
                .filter(u -> userHasPermission(u, "RECLAMATION_TREAT"))
                .forEach(u -> notificationService.creer(
                        u.getKeycloakId(),
                        NotificationType.RECLAMATION_SOUMISE,
                        "Nouvelle réclamation 📋",
                        demandeur.getNomComplet() + " a soumis : \"" + r.getSujet() + "\"",
                        "/reclamations/gerer",
                        r.getId()
                ));
    }

    private void notifierAgentsCommentaire(Reclamation r, String auteurNom) {
        utilisateurRepo.findAll().stream()
                .filter(u -> u.getProfil() != null && u.getKeycloakId() != null)
                .filter(u -> userHasPermission(u, "RECLAMATION_TREAT"))
                .forEach(u -> notificationService.creer(
                        u.getKeycloakId(),
                        NotificationType.RECLAMATION_COMMENTEE,
                        "Nouveau commentaire réclamation",
                        auteurNom + " a commenté la réclamation \"" + r.getSujet() + "\".",
                        "/reclamations/gerer",
                        r.getId()
                ));
    }

    private void notifierDemandeur(Reclamation r, String statutCode) {
        if (r.getUtilisateur() == null || r.getUtilisateur().getKeycloakId() == null) return;
        String keycloakId = r.getUtilisateur().getKeycloakId();

        boolean estResolue = "RESOLUE".equalsIgnoreCase(statutCode) || "FERMEE".equalsIgnoreCase(statutCode);
        boolean estRejetee = "REJETEE".equalsIgnoreCase(statutCode);

        if (estResolue) {
            notificationService.creer(keycloakId,
                    NotificationType.RECLAMATION_RESOLUE,
                    "Réclamation résolue ✅",
                    "Votre réclamation \"" + r.getSujet() + "\" a été résolue." +
                            (r.getCommentaireTraitement() != null ? " — " + r.getCommentaireTraitement() : ""),
                    "/reclamations",
                    r.getId()
            );
        } else if (estRejetee) {
            notificationService.creer(keycloakId,
                    NotificationType.RECLAMATION_REJETEE,
                    "Réclamation rejetée ❌",
                    "Votre réclamation \"" + r.getSujet() + "\" a été rejetée." +
                            (r.getCommentaireTraitement() != null ? " — " + r.getCommentaireTraitement() : ""),
                    "/reclamations",
                    r.getId()
            );
        } else {
            notificationService.creer(keycloakId,
                    NotificationType.RECLAMATION_MISE_A_JOUR,
                    "Réclamation mise à jour",
                    "Le statut de votre réclamation \"" + r.getSujet() + "\" a changé.",
                    "/reclamations",
                    r.getId()
            );
        }
    }

    private boolean userHasPermission(Utilisateur u, String permCode) {
        return profilPermRepo.findPermissionCodesByProfilId(u.getProfil().getId()).contains(permCode);
    }
}