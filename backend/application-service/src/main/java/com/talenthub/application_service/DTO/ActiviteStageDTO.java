// ActiviteStageDTO.java
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.ActiviteStage;
import lombok.Getter;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
public class ActiviteStageDTO {
    private final Long id;
    private final String titre;
    private final String description;
    private final LocalDate dateDebut;
    private final LocalDate dateFin;
    private final Integer avancement;
    private final String statut;
    private final String commentaire;
    private final Long projetId;
    private final String projetTitre;
    private final Long createurId;
    private final String createurNom;
    private final Long assigneId;
    private final String assigneNom;
    private final LocalDateTime createdAt;

    public ActiviteStageDTO(ActiviteStage a) {
        this.id = a.getId();
        this.titre = a.getTitre();
        this.description = a.getDescription();
        this.dateDebut = a.getDateDebut();
        this.dateFin = a.getDateFin();
        this.avancement = a.getAvancement();
        this.statut = a.getStatut();
        this.commentaire = a.getCommentaire();
        this.projetId = a.getProjet() != null ? a.getProjet().getId() : null;
        this.projetTitre = a.getProjet() != null ? a.getProjet().getTitre() : null;
        this.createurId = a.getCreateur() != null ? a.getCreateur().getId() : null;
        this.createurNom = a.getCreateur() != null ? a.getCreateur().getNomComplet() : null;
        this.assigneId = a.getAssigne() != null ? a.getAssigne().getId() : null;
        this.assigneNom = a.getAssigne() != null ? a.getAssigne().getNomComplet() : null;
        this.createdAt = a.getCreatedAt();
    }
}