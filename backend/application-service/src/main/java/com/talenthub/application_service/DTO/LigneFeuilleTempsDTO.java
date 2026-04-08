package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.LigneFeuilleTemps;
import lombok.Getter;
import java.time.LocalDate;

@Getter
public class LigneFeuilleTempsDTO {
    private final Long id;
    private final LocalDate date;
    private final String categorieCode;
    private final String heureDebut;
    private final String heureFin;
    private final int minutesNormales;
    private final int minutesSupplementaires;
    private final int minutesAbsence;
    private final String commentaire;
    private final int totalMinutes;

    public LigneFeuilleTempsDTO(LigneFeuilleTemps l) {
        this.id = l.getId();
        this.date = l.getDate();
        this.categorieCode = l.getCategorieCode();
        this.heureDebut = l.getHeureDebut();
        this.heureFin = l.getHeureFin();
        this.minutesNormales = l.getMinutesNormales();
        this.minutesSupplementaires = l.getMinutesSupplementaires();
        this.minutesAbsence = l.getMinutesAbsence();
        this.commentaire = l.getCommentaire();
        this.totalMinutes = l.getMinutesNormales()
                + l.getMinutesSupplementaires()
                + l.getMinutesAbsence();
    }
}