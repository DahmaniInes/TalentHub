// application-service/.../DTO/ReclamationDTO.java
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Reclamation;
import com.talenthub.application_service.Entity.CommentaireReclamation;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
public class ReclamationDTO {
    private Long          id;
    private Long          serviceReclamationId;
    private Long          statutReclamationId;
    private Long          utilisateurId;
    private String        utilisateurNom;
    private String        utilisateurEmail;
    private String        utilisateurPhotoUrl;
    private String        traitePar;
    private String        sujet;
    private String        description;
    private String        pieceJointeUrl;
    private String        commentaireTraitement;
    private LocalDateTime dateCreation;
    private LocalDateTime dateMiseAJour;
    private LocalDateTime dateTraitement;
    private List<CommentaireReclamationDTO> commentaires;

    public ReclamationDTO(Reclamation r) {
        this.id                    = r.getId();
        this.serviceReclamationId  = r.getServiceReclamationId();
        this.statutReclamationId   = r.getStatutReclamationId();
        this.traitePar             = r.getTraitePar();
        this.sujet                 = r.getSujet();
        this.description           = r.getDescription();
        this.pieceJointeUrl        = r.getPieceJointeUrl();
        this.commentaireTraitement = r.getCommentaireTraitement();
        this.dateCreation          = r.getDateCreation();
        this.dateMiseAJour         = r.getDateMiseAJour();
        this.dateTraitement        = r.getDateTraitement();
        if (r.getUtilisateur() != null) {
            this.utilisateurId      = r.getUtilisateur().getId();
            this.utilisateurNom     = r.getUtilisateur().getNomComplet();
            this.utilisateurEmail   = r.getUtilisateur().getEmail();
            this.utilisateurPhotoUrl = r.getUtilisateur().getPhotoUrl();
        }
        this.commentaires = r.getCommentaires() == null ? List.of()
                : r.getCommentaires().stream().map(CommentaireReclamationDTO::new).toList();
    }
}
