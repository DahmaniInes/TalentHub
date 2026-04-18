// src/main/java/com/talenthub/application_service/DTO/LigneFeuilleTempsRequest.java
package com.talenthub.application_service.DTO;

import lombok.Data;
import java.time.LocalDate;

@Data
public class LigneFeuilleTempsRequest {
    private LocalDate date;

    private Long   projetId;
    private String projetNom;
    private Long   activiteId;
    private String activiteNom;
    private Long   clientId;
    private String clientNom;

    private String heureDebut;
    private String heureFin;

    private int minutesTravaillees;
    private int minutesSupplementaires;

    private String  commentaire;
    private boolean estWeekend;
}