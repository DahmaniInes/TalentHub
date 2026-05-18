// DTO/LigneFeuilleTempsRequest.java — SANS projetNom et activiteNom
package com.talenthub.application_service.DTO;

import lombok.Data;
import java.time.LocalDate;

@Data
public class LigneFeuilleTempsRequest {

    private LocalDate date;

    // ✅ IDs uniquement — les noms sont résolus côté backend
    private Long projetId;
    // ← projetNom supprimé

    private Long activiteId;
    // ← activiteNom supprimé

    private Long   clientId;
    private String clientNom;   // ← client gardé (lookup moins fréquent)

    private String heureDebut;
    private String heureFin;

    private int minutesTravaillees;
    private int minutesSupplementaires;

    private String  commentaire;
    private boolean estWeekend;
}