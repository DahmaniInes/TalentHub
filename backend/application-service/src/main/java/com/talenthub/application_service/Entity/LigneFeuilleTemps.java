package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "lignes_feuille_temps")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LigneFeuilleTemps {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "feuille_temps_id", nullable = false)
    private FeuilleTemps feuilleTemps;

    @Column(nullable = false)
    private LocalDate date;

    // Référence vers CategorieEntree du nomenclature-service
    // TRAVAIL | CONGE | MALADIE | FERIE | AUTRE
    @Column(name = "categorie_code", nullable = false, length = 50)
    private String categorieCode;

    @Column(name = "heure_debut", length = 10)
    private String heureDebut; // "08:00"

    @Column(name = "heure_fin", length = 10)
    private String heureFin;   // "17:00"

    // Stockage en minutes
    @Column(name = "minutes_normales")
    @Builder.Default
    private int minutesNormales = 0;

    @Column(name = "minutes_supplementaires")
    @Builder.Default
    private int minutesSupplementaires = 0;

    @Column(name = "minutes_absence")
    @Builder.Default
    private int minutesAbsence = 0;

    @Column(length = 255)
    private String commentaire;
}