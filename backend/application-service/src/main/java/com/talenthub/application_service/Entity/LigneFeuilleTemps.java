package com.talenthub.application_service.Entity;


import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
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

    @NotNull
    @Column(nullable = false)
    private LocalDate date;

    // PRESENT | ABSENT | CONGE | MALADIE | FERIE
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String typeJour = "PRESENT";

    @Column(name = "heure_arrivee", length = 10)
    private String heureArrivee; // ex: "08:30"

    @Column(name = "heure_depart", length = 10)
    private String heureDepart; // ex: "17:30"

    @Column(name = "heures_travaillees")
    @Builder.Default
    private double heuresTravaillees = 0.0;

    @Column(name = "heures_sup")
    @Builder.Default
    private double heuresSup = 0.0;

    @Column(length = 255)
    private String commentaire;


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public FeuilleTemps getFeuilleTemps() {
        return feuilleTemps;
    }

    public void setFeuilleTemps(FeuilleTemps feuilleTemps) {
        this.feuilleTemps = feuilleTemps;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getTypeJour() {
        return typeJour;
    }

    public void setTypeJour(String typeJour) {
        this.typeJour = typeJour;
    }

    public String getHeureArrivee() {
        return heureArrivee;
    }

    public void setHeureArrivee(String heureArrivee) {
        this.heureArrivee = heureArrivee;
    }

    public String getHeureDepart() {
        return heureDepart;
    }

    public void setHeureDepart(String heureDepart) {
        this.heureDepart = heureDepart;
    }

    public double getHeuresTravaillees() {
        return heuresTravaillees;
    }

    public void setHeuresTravaillees(double heuresTravaillees) {
        this.heuresTravaillees = heuresTravaillees;
    }

    public double getHeuresSup() {
        return heuresSup;
    }

    public void setHeuresSup(double heuresSup) {
        this.heuresSup = heuresSup;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }
}
