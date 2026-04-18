// src/main/java/com/talenthub/application_service/DTO/FeuilleTempsRequest.java
package com.talenthub.application_service.DTO;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class FeuilleTempsRequest {

    @NotNull
    private Long utilisateurId;

    @NotNull
    private LocalDate semaineDu;

    @NotNull
    private LocalDate semaineAu;

    // Totaux calculés depuis les lignes
    private int minutesTravaillees;
    private int minutesSupplementaires;

    private String statut;
    private String commentaireEmploye;

    private List<LigneFeuilleTempsRequest> lignes;
}