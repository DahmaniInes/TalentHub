// Entity/LigneFeuilleTemps.java — IDs uniquement, AUCUN nom des autres tables
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

    @Column(name = "categorie_code")
    @Builder.Default
    private String categorieCode = "PROJET";

    // ✅ IDs uniquement — AUCUN nom stocké en BD
    @Column(name = "projet_id")
    private Long projetId;

    @Column(name = "activite_id")
    private Long activiteId;

    @Column(name = "client_id")
    private Long clientId;

    // ── Horaires ──
    @Column(name = "heure_debut", length = 10)
    private String heureDebut;

    @Column(name = "heure_fin", length = 10)
    private String heureFin;

    // ── Durée en minutes ──
    @Column(name = "minutes_travaillees")
    @Builder.Default
    private int minutesTravaillees = 0;

    @Column(name = "minutes_supplementaires")
    @Builder.Default
    private int minutesSupplementaires = 0;

    @Column(length = 500)
    private String commentaire;

    @Column(name = "est_weekend")
    @Builder.Default
    private boolean estWeekend = false;



    @Column(name = "outlook_event_id", length = 500)
    private String outlookEventId;
}