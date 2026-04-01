package com.talenthub.application_service.DTO;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FeuilleTempsRequest {

    @NotNull
    private Long utilisateurId;

    @NotNull
    private LocalDate semaineDu;

    @NotNull
    private LocalDate semaineAu;

    // ✅ En minutes côté API
    private int minutesTravaillees;
    private int minutesSupplementaires;
    private int minutesAbsence;

    private String statut;
    private String commentaireEmploye;
    private String commentaireValideur;
    private String validePar;
}