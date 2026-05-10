// application-service/.../Service/DemandeService.java — REMPLACE
package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.DemandeRequest;
import com.talenthub.application_service.Entity.Demande;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Enum.NotificationType;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.DemandeRepository;
import com.talenthub.application_service.Repository.ProfilPermissionRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class DemandeService {

    private final DemandeRepository          repository;
    private final UtilisateurRepository      utilisateurRepository;
    private final NotificationService        notificationService;
    private final ProfilPermissionRepository profilPermRepo; // pour trouver les approbateurs

    public DemandeService(DemandeRepository repository,
                          UtilisateurRepository utilisateurRepository,
                          NotificationService notificationService,
                          ProfilPermissionRepository profilPermRepo) {
        this.repository           = repository;
        this.utilisateurRepository = utilisateurRepository;
        this.notificationService  = notificationService;
        this.profilPermRepo       = profilPermRepo;
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

        // ✅ Notifier les approbateurs (ceux qui ont DEMANDE_APPROVE)
        notifierApprobateurs(saved, utilisateur);

        return saved;
    }

    public Demande update(Long id, DemandeRequest req) {
        Demande d = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande non trouvée: " + id));

        d.setSujet(req.getSujet());
        d.setDescription(req.getDescription());
        d.setDateDebut(req.getDateDebut());
        d.setDateFin(req.getDateFin());
        d.setNbJours(req.getNbJours());
        d.setTypeDemandeId(req.getTypeDemandeId());
        if (req.getStatutDemandeId() != null) d.setStatutDemandeId(req.getStatutDemandeId());

        return repository.save(d);
    }



// DemandeService.java — REMPLACE traiter() et notifierDemandeur()

// Ajouter l'injection du repository de statuts via HTTP vers nomenclature
// OU plus simple : passer le code du statut directement depuis le controller

    public Demande traiter(Long id, Long statutId, String traitePar,
                           String commentaireRH, String statutCode) { // ← ajouter statutCode
        Demande d = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande non trouvée: " + id));

        d.setStatutDemandeId(statutId);
        d.setTraitePar(traitePar);
        d.setCommentaireRH(commentaireRH);
        d.setDateTraitement(LocalDateTime.now());
        Demande saved = repository.save(d);

        // ✅ Utiliser le code passé par le frontend — plus d'heuristique sur l'ID
        notifierDemandeur(saved, statutCode);
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
        if (!repository.existsById(id))
            throw new ResourceNotFoundException("Demande non trouvée: " + id);
        repository.deleteById(id);
    }

    // ── Notifications ──────────────────────────────────────────────────────

    private void notifierApprobateurs(Demande demande, Utilisateur demandeur) {
        // Trouver tous les users ayant la permission DEMANDE_APPROVE
        utilisateurRepository.findAll().stream()
                .filter(u -> u.getProfil() != null && u.getKeycloakId() != null)
                .filter(u -> !u.getId().equals(demandeur.getId())) // pas le demandeur lui-même
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

    private void notifierDemandeur(Demande demande) {
        if (demande.getUtilisateur() == null) return;
        String keycloakId = demande.getUtilisateur().getKeycloakId();
        if (keycloakId == null) return;

        // Déterminer si acceptée ou rejetée selon l'id du statut
        // On utilise un heuristique simple : statutId > 1 = traité
        // Tu peux affiner en comparant avec le code du statut
        boolean estAcceptee = isStatutAccepte(demande.getStatutDemandeId());

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
        } else {
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

    private boolean userHasPermission(Utilisateur u, String permCode) {
        return profilPermRepo.findPermissionCodesByProfilId(u.getProfil().getId())
                .contains(permCode);
    }

    /**
     * Heuristique simple : si le statutId correspond à "ACCEPTEE".
     * À affiner selon ta table statuts_demande.
     * Idéalement tu queries le code du statut depuis la nomenclature.
     */
    private boolean isStatutAccepte(Long statutId) {
        // Adapte selon tes IDs réels en BD
        // Tu peux aussi faire un appel HTTP vers nomenclature-service pour récupérer le code
        // Pour l'instant, on considère que l'ID 2 = ACCEPTEE, 3 = REJETEE (à adapter)
        return statutId != null && statutId == 2L;
    }
}