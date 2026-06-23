// DTO/EvaluationActiviteDTO.java — NOUVEAU
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.EvaluationActivite;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class EvaluationActiviteDTO {

    private final Long          id;
    private final Long          activiteId;
    private final String        evaluateurKeycloakId;
    private final String        evaluateurNom;
    private final Integer       note;
    private final String        commentaire;
    private final LocalDateTime dateCreation;
    private final LocalDateTime dateMiseAJour;

    public EvaluationActiviteDTO(EvaluationActivite e) {
        this.id                   = e.getId();
        this.activiteId            = e.getActivite() != null ? e.getActivite().getId() : null;
        this.evaluateurKeycloakId  = e.getEvaluateurKeycloakId();
        this.evaluateurNom         = e.getEvaluateurNom();
        this.note                  = e.getNote();
        this.commentaire           = e.getCommentaire();
        this.dateCreation          = e.getDateCreation();
        this.dateMiseAJour         = e.getDateMiseAJour();
    }
}