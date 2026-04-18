// src/main/java/com/talenthub/application_service/Entity/LigneFeuilleTemps.java
package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "lignes_feuille_temps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LigneFeuilleTemps {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "feuille_temps_id", nullable = false)
    private FeuilleTemps feuilleTemps;

    @Column(nullable = false)
    private LocalDate date;

    // ─── Référence projet/activité (remplace categorieCode) ───
    @Column(name = "projet_id")
    private Long projetId;

    @Column(name = "projet_nom", length = 200)
    private String projetNom;

    @Column(name = "activite_id")
    private Long activiteId;

    @Column(name = "activite_nom", length = 200)
    private String activiteNom;

    @Column(name = "client_id")
    private Long clientId;

    @Column(name = "client_nom", length = 200)
    private String clientNom;

    // ─── Horaires ───
    @Column(name = "heure_debut", length = 10)
    private String heureDebut;   // "08:00"

    @Column(name = "heure_fin", length = 10)
    private String heureFin;     // "17:00"

    // ─── Durée en minutes ───
    @Column(name = "minutes_travaillees")
    @Builder.Default
    private int minutesTravaillees = 0;

    @Column(name = "minutes_supplementaires")
    @Builder.Default
    private int minutesSupplementaires = 0;

    @Column(length = 500)
    private String commentaire;

    // ─── Weekend flag ───
    @Column(name = "est_weekend")
    @Builder.Default
    private boolean estWeekend = false;
}