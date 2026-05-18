// src/main/java/com/talenthub/application_service/Service/CommentaireService.java
package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.*;
import com.talenthub.application_service.Enum.NotificationType;
import com.talenthub.application_service.Repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommentaireService {

    private final CommentaireRepository commentaireRepo;
    private final ProjetRepository      projetRepo;
    private final ActiviteRepository    activiteRepo;
    private final GroupeRepository      groupeRepo;
    private final UtilisateurRepository utilisateurRepo;
    private final NotificationService   notificationService;

    // ══════════════════════════════════════════════════════════════
    // LECTURE
    // ══════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<Commentaire> getByProjet(Long projetId) {
        return commentaireRepo.findByProjetId(projetId);
    }

    @Transactional(readOnly = true)
    public List<Commentaire> getByActivite(Long activiteId) {
        return commentaireRepo.findByActiviteId(activiteId);
    }

    // ══════════════════════════════════════════════════════════════
    // COMMENTAIRE PROJET
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public Commentaire createForProjet(Long projetId, String contenu,
                                       String auteurKeycloakId, String auteurNom,
                                       String auteurPhotoUrl, Long groupeId) {

        Projet p = projetRepo.findById(projetId)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé: " + projetId));

        Commentaire c = Commentaire.builder()
                .contenu(contenu)
                .auteurKeycloakId(auteurKeycloakId)
                .auteurNom(auteurNom)
                .auteurPhotoUrl(auteurPhotoUrl)
                .projet(p)
                .build();

        if (groupeId != null) {
            groupeRepo.findById(groupeId).ifPresent(c::setGroupe);
        }

        Commentaire saved = commentaireRepo.save(c);

        // ✅ Notifier tous les membres du projet (sauf l'auteur)
        notifierMembresProjet(p, auteurKeycloakId, auteurNom,
                "Nouveau commentaire sur \"" + p.getNom() + "\"",
                auteurNom + " a commenté : " + truncate(contenu, 80),
                "/projets/" + projetId,
                projetId,
                NotificationType.PROJET_COMMENTAIRE);

        return saved;
    }

    // ══════════════════════════════════════════════════════════════
    // COMMENTAIRE ACTIVITÉ
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public Commentaire createForActivite(Long activiteId, String contenu,
                                         String auteurKeycloakId, String auteurNom,
                                         String auteurPhotoUrl, Long groupeId) {

        Activité a = activiteRepo.findById(activiteId)
                .orElseThrow(() -> new RuntimeException("Activité non trouvée: " + activiteId));

        Commentaire c = Commentaire.builder()
                .contenu(contenu)
                .auteurKeycloakId(auteurKeycloakId)
                .auteurNom(auteurNom)
                .auteurPhotoUrl(auteurPhotoUrl)
                .activite(a)
                .build();

        if (groupeId != null) {
            groupeRepo.findById(groupeId).ifPresent(c::setGroupe);
        }

        Commentaire saved = commentaireRepo.save(c);

        // ✅ Notifier tous les membres des groupes assignés à l'activité (sauf l'auteur)
        notifierMembresActivite(a, auteurKeycloakId, auteurNom,
                "Nouveau commentaire sur \"" + a.getNom() + "\"",
                auteurNom + " a commenté : " + truncate(contenu, 80),
                "/activites/" + activiteId,
                activiteId,
                NotificationType.ACTIVITE_COMMENTAIRE);

        return saved;
    }

    // ══════════════════════════════════════════════════════════════
    // MISE À JOUR / SUPPRESSION
    // ══════════════════════════════════════════════════════════════

    @Transactional
    public Commentaire update(Long id, String contenu, String auteurKeycloakId) {
        Commentaire c = commentaireRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Commentaire non trouvé: " + id));
        if (!c.getAuteurKeycloakId().equals(auteurKeycloakId)) {
            throw new SecurityException("Vous ne pouvez modifier que vos propres commentaires");
        }
        c.setContenu(contenu);
        return commentaireRepo.save(c);
    }

    @Transactional
    public void delete(Long id, String auteurKeycloakId) {
        Commentaire c = commentaireRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Commentaire non trouvé: " + id));
        if (!c.getAuteurKeycloakId().equals(auteurKeycloakId)) {
            throw new SecurityException("Vous ne pouvez supprimer que vos propres commentaires");
        }
        commentaireRepo.deleteById(id);
    }

    // ══════════════════════════════════════════════════════════════
    // HELPERS NOTIFICATIONS
    // ══════════════════════════════════════════════════════════════

    /**
     * Notifie tous les membres des groupes du projet — sauf l'auteur.
     * Utilise les groupes du projet (relation ManyToMany Projet <-> Groupe).
     */
    private void notifierMembresProjet(Projet projet, String auteurKcId,
                                       String auteurNom, String titre,
                                       String description, String lien,
                                       Long ressourceId, NotificationType type) {
        try {
            // Collecter les keycloakIds de tous les membres des groupes du projet
            Set<String> destinataires = projet.getGroupes().stream()
                    .flatMap(g -> g.getMembres().stream())
                    .map(Utilisateur::getKeycloakId)
                    .filter(kcId -> kcId != null && !kcId.equals(auteurKcId))
                    .collect(Collectors.toSet());

            // Ajouter le responsable du projet si défini
            if (projet.getResponsableKeycloakId() != null
                    && !projet.getResponsableKeycloakId().equals(auteurKcId)) {
                destinataires.add(projet.getResponsableKeycloakId());
            }

            destinataires.forEach(kcId -> {
                try {
                    notificationService.creer(kcId, type, titre, description, lien, ressourceId);
                } catch (Exception e) {
                    log.warn("Impossible d'envoyer la notification à {}: {}", kcId, e.getMessage());
                }
            });

            log.debug("Notifications envoyées à {} membre(s) du projet {}", destinataires.size(), projet.getNom());
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi des notifications projet: {}", e.getMessage());
        }
    }

    /**
     * Notifie tous les membres des groupes assignés à l'activité — sauf l'auteur.
     */
    private void notifierMembresActivite(Activité activite, String auteurKcId,
                                         String auteurNom, String titre,
                                         String description, String lien,
                                         Long ressourceId, NotificationType type) {
        try {
            Set<String> destinataires = activite.getGroupes().stream()
                    .flatMap(g -> g.getMembres().stream())
                    .map(Utilisateur::getKeycloakId)
                    .filter(kcId -> kcId != null && !kcId.equals(auteurKcId))
                    .collect(Collectors.toSet());

            // Notifier aussi l'assigné de l'activité si défini
            if (activite.getUtilisateur() != null
                    && activite.getUtilisateur().getKeycloakId() != null
                    && !activite.getUtilisateur().getKeycloakId().equals(auteurKcId)) {
                destinataires.add(activite.getUtilisateur().getKeycloakId());
            }

            destinataires.forEach(kcId -> {
                try {
                    notificationService.creer(kcId, type, titre, description, lien, ressourceId);
                } catch (Exception e) {
                    log.warn("Impossible d'envoyer la notification à {}: {}", kcId, e.getMessage());
                }
            });

            log.debug("Notifications envoyées à {} membre(s) de l'activité {}", destinataires.size(), activite.getNom());
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi des notifications activité: {}", e.getMessage());
        }
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        return text.length() > maxLength ? text.substring(0, maxLength) + "…" : text;
    }
}