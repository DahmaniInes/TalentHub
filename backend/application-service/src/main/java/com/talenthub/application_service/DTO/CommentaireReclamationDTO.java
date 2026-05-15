package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.CommentaireReclamation;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class CommentaireReclamationDTO {
    private Long          id;
    private String        auteurKeycloakId;
    private String        auteurNom;
    private boolean       estAdmin;
    private String        contenu;
    private LocalDateTime dateCreation;

    public CommentaireReclamationDTO(CommentaireReclamation c) {
        this.id               = c.getId();
        this.auteurKeycloakId = c.getAuteurKeycloakId();
        this.auteurNom        = c.getAuteurNom();
        this.estAdmin         = c.isEstAdmin();
        this.contenu          = c.getContenu();
        this.dateCreation     = c.getDateCreation();
    }
}
