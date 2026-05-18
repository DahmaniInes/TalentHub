// DTO/LigneFeuilleTempsDTO.java — noms résolus au runtime, pas stockés
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.LigneFeuilleTemps;
import lombok.Getter;
import java.time.LocalDate;

@Getter
public class LigneFeuilleTempsDTO {

    private final Long      id;
    private final LocalDate date;

    // IDs (stockés en BD)
    private final Long projetId;
    private final Long activiteId;
    private final Long clientId;

    // Noms résolus au runtime (jamais en BD)
    private final String projetNom;
    private final String activiteNom;
    private final String clientNom;

    private final String  heureDebut;
    private final String  heureFin;
    private final int     minutesTravaillees;
    private final int     minutesSupplementaires;
    private final String  commentaire;
    private final int     totalMinutes;
    private final boolean estWeekend;

    // Constructeur simple sans résolution
    public LigneFeuilleTempsDTO(LigneFeuilleTemps l) {
        this(l, null, null, null);
    }

    // ✅ Constructeur enrichi : noms passés depuis le service
    public LigneFeuilleTempsDTO(LigneFeuilleTemps l,
                                String projetNom,
                                String activiteNom,
                                String clientNom) {
        this.id                     = l.getId();
        this.date                   = l.getDate();
        this.projetId               = l.getProjetId();
        this.activiteId             = l.getActiviteId();
        this.clientId               = l.getClientId();
        this.projetNom              = projetNom;
        this.activiteNom            = activiteNom;
        this.clientNom              = clientNom;
        this.heureDebut             = l.getHeureDebut();
        this.heureFin               = l.getHeureFin();
        this.minutesTravaillees     = l.getMinutesTravaillees();
        this.minutesSupplementaires = l.getMinutesSupplementaires();
        this.commentaire            = l.getCommentaire();
        this.totalMinutes           = l.getMinutesTravaillees() + l.getMinutesSupplementaires();
        this.estWeekend             = l.isEstWeekend();
    }
}