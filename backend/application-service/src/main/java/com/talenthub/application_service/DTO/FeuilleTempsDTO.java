package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.FeuilleTemps;
import lombok.Getter;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
public class FeuilleTempsDTO {
    private final Long id;
    private final Long utilisateurId;
    private final String utilisateurNom;
    private final LocalDate semaineDu;
    private final LocalDate semaineAu;
    private final int minutesTravaillees;      // ✅ en minutes
    private final int minutesSupplementaires;
    private final int minutesAbsence;
    private final String statut;
    private final String commentaireEmploye;
    private final String commentaireValideur;
    private final String validePar;
    private final LocalDateTime dateValidation;
    private final LocalDateTime dateCreation;
    private final LocalDateTime dateMiseAJour;

    public FeuilleTempsDTO(FeuilleTemps ft) {
        this.id = ft.getId();
        this.utilisateurId = ft.getUtilisateur() != null ? ft.getUtilisateur().getId() : null;
        this.utilisateurNom = ft.getUtilisateur() != null ? ft.getUtilisateur().getNomComplet() : null;
        this.semaineDu = ft.getSemaineDu();
        this.semaineAu = ft.getSemaineAu();
        // ✅ Convertir double heures → int minutes
        this.minutesTravaillees = (int) Math.round(ft.getHeuresTravaillees() * 60);
        this.minutesSupplementaires = (int) Math.round(ft.getHeuresSupplementaires() * 60);
        this.minutesAbsence = (int) Math.round(ft.getHeuresAbsence() * 60);
        this.statut = ft.getStatut();
        this.commentaireEmploye = ft.getCommentaireEmploye();
        this.commentaireValideur = ft.getCommentaireValideur();
        this.validePar = ft.getValidePar();
        this.dateValidation = ft.getDateValidation();
        this.dateCreation = ft.getDateCreation();
        this.dateMiseAJour = ft.getDateMiseAJour();
    }
}