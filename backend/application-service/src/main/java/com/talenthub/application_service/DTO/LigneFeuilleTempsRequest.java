package com.talenthub.application_service.DTO;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LigneFeuilleTempsRequest {

    private LocalDate date;

    // TRAVAIL | CONGE | MALADIE | FERIE | AUTRE
    private String categorieCode;

    private String heureDebut;   // "08:00"
    private String heureFin;     // "17:00"

    // ✅ En minutes
    private int minutesNormales;
    private int minutesSupplementaires;
    private int minutesAbsence;

    private String commentaire;
}