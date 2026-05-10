// src/main/java/com/talenthub/application_service/Service/CommentaireService.java
package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.*;
import com.talenthub.application_service.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommentaireService {

    private final CommentaireRepository commentaireRepo;
    private final ProjetRepository      projetRepo;
    private final ActiviteRepository    activiteRepo;
    private final GroupeRepository      groupeRepo;

    @Transactional(readOnly = true)
    public List<Commentaire> getByProjet(Long projetId) {
        return commentaireRepo.findByProjetId(projetId);
    }

    @Transactional(readOnly = true)
    public List<Commentaire> getByActivite(Long activiteId) {
        return commentaireRepo.findByActiviteId(activiteId);
    }

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
        return commentaireRepo.save(c);
    }

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
        return commentaireRepo.save(c);
    }

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
}