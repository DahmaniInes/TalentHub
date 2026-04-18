// src/main/java/com/talenthub/application_service/DTO/LigneFeuilleTempsDTO.java
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.LigneFeuilleTemps;
import lombok.Getter;
import java.time.LocalDate;

@Getter
public class LigneFeuilleTempsDTO {

    private final Long      id;
    private final LocalDate date;

    // ✅ Nouveaux champs — remplacent categorieCode
    private final Long   projetId;
    private final String projetNom;
    private final Long   activiteId;
    private final String activiteNom;
    private final Long   clientId;
    private final String clientNom;

    private final String heureDebut;
    private final String heureFin;

    // ✅ minutesNormales → minutesTravaillees, minutesAbsence supprimé
    private final int    minutesTravaillees;
    private final int    minutesSupplementaires;
    private final String commentaire;
    private final int    totalMinutes;
    private final boolean estWeekend;

    public LigneFeuilleTempsDTO(LigneFeuilleTemps l) {
        this.id                     = l.getId();
        this.date                   = l.getDate();
        this.projetId               = l.getProjetId();
        this.projetNom              = l.getProjetNom();
        this.activiteId             = l.getActiviteId();
        this.activiteNom            = l.getActiviteNom();
        this.clientId               = l.getClientId();
        this.clientNom              = l.getClientNom();
        this.heureDebut             = l.getHeureDebut();
        this.heureFin               = l.getHeureFin();
        this.minutesTravaillees     = l.getMinutesTravaillees();
        this.minutesSupplementaires = l.getMinutesSupplementaires();
        this.commentaire            = l.getCommentaire();
        this.totalMinutes           = l.getMinutesTravaillees() + l.getMinutesSupplementaires();
        this.estWeekend             = l.isEstWeekend();
    }
}