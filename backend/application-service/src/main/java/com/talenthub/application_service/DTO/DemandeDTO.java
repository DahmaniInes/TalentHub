package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Demande;
import lombok.Getter;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
public class DemandeDTO {
    private final Long id;
    private final Long typeDemandeId;
    private final Long statutDemandeId;
    private final Long utilisateurId;
    private final String utilisateurNom;
    private final String traitePar;
    private final String sujet;
    private final String description;
    private final LocalDate dateDebut;
    private final LocalDate dateFin;
    private final Integer nbJours;
    private final String commentaireRH;
    private final String pieceJointeUrl;
    private final LocalDateTime dateCreation;
    private final LocalDateTime dateMiseAJour;
    private final LocalDateTime dateTraitement;

    public DemandeDTO(Demande d) {
        this.id = d.getId();
        this.typeDemandeId = d.getTypeDemandeId();
        this.statutDemandeId = d.getStatutDemandeId();
        this.utilisateurId = d.getUtilisateur() != null ? d.getUtilisateur().getId() : null;
        this.utilisateurNom = d.getUtilisateur() != null ? d.getUtilisateur().getNomComplet() : null;
        this.traitePar = d.getTraitePar();
        this.sujet = d.getSujet();
        this.description = d.getDescription();
        this.dateDebut = d.getDateDebut();
        this.dateFin = d.getDateFin();
        this.nbJours = d.getNbJours();
        this.commentaireRH = d.getCommentaireRH();
        this.pieceJointeUrl = d.getPieceJointeUrl();
        this.dateCreation = d.getDateCreation();
        this.dateMiseAJour = d.getDateMiseAJour();
        this.dateTraitement = d.getDateTraitement();
    }
}