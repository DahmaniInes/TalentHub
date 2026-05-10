// src/main/java/com/talenthub/application_service/DTO/CommentaireDTO.java
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Commentaire;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class CommentaireDTO {
    private Long          id;
    private String        contenu;
    private String        auteurKeycloakId;
    private String        auteurNom;
    private String        auteurPhotoUrl;
    private Long          projetId;
    private Long          activiteId;
    private Long          groupeId;
    private String        groupeNom;
    private LocalDateTime dateCreation;
    private LocalDateTime dateMiseAJour;
    private boolean       edite;

    public CommentaireDTO(Commentaire c) {
        this.id               = c.getId();
        this.contenu          = c.getContenu();
        this.auteurKeycloakId = c.getAuteurKeycloakId();
        this.auteurNom        = c.getAuteurNom();
        this.auteurPhotoUrl   = c.getAuteurPhotoUrl();
        this.dateCreation     = c.getDateCreation();
        this.dateMiseAJour    = c.getDateMiseAJour();
        this.edite            = c.isEdite();
        try { if (c.getProjet()   != null) this.projetId   = c.getProjet().getId();   } catch (Exception ignored) {}
        try { if (c.getActivite() != null) this.activiteId = c.getActivite().getId(); } catch (Exception ignored) {}
        try { if (c.getGroupe()   != null) { this.groupeId = c.getGroupe().getId(); this.groupeNom = c.getGroupe().getNom(); } } catch (Exception ignored) {}
    }
}