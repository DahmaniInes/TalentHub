package com.talenthub.application_service.DTO;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeuilleTempsRequest {

    @NotNull(message = "L'utilisateur est obligatoire")
    private Long utilisateurId;

    @NotNull(message = "La date de début de semaine est obligatoire")
    private LocalDate semaineDu;

    @NotNull(message = "La date de fin de semaine est obligatoire")
    private LocalDate semaineAu;

    // ✅ Stockés en minutes côté API
    private int minutesTravaillees;
    private int minutesSupplementaires;
    private int minutesAbsence;

    // BROUILLON | SOUMISE | VALIDEE | REJETEE
    private String statut;

    private String commentaireEmploye;

    // ✅ Lignes détaillées du tableau hebdomadaire
    @Builder.Default
    private List<LigneFeuilleTempsRequest> lignes = new ArrayList<>();
}