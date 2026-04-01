package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "feuilles_temps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeuilleTemps {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    @NotNull
    @Column(name = "semaine_du", nullable = false)
    private LocalDate semaineDu; // Lundi de la semaine

    @NotNull
    @Column(name = "semaine_au", nullable = false)
    private LocalDate semaineAu; // Vendredi de la semaine

    @Column(name = "heures_travaillees", nullable = false)
    @Builder.Default
    private double heuresTravaillees = 0.0;

    @Column(name = "heures_supplementaires", nullable = false)
    @Builder.Default
    private double heuresSupplementaires = 0.0;

    @Column(name = "heures_absence", nullable = false)
    @Builder.Default
    private double heuresAbsence = 0.0;

    // BROUILLON | SOUMISE | VALIDEE | REJETEE
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String statut = "BROUILLON";

    @Column(name = "commentaire_employe", columnDefinition = "TEXT")
    private String commentaireEmploye;

    @Column(name = "commentaire_valideur", columnDefinition = "TEXT")
    private String commentaireValideur;

    // keycloakId du valideur (RH ou Manager)
    @Column(name = "valide_par", length = 100)
    private String validePar;

    @Column(name = "date_validation")
    private LocalDateTime dateValidation;

    @Column(name = "date_creation", updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_mise_a_jour")
    private LocalDateTime dateMiseAJour;

    // Détail jour par jour
    @OneToMany(mappedBy = "feuilleTemps", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<LigneFeuilleTemps> lignes = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.dateCreation  = LocalDateTime.now();
        this.dateMiseAJour = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.dateMiseAJour = LocalDateTime.now();
    }


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Utilisateur getUtilisateur() {
        return utilisateur;
    }

    public void setUtilisateur(Utilisateur utilisateur) {
        this.utilisateur = utilisateur;
    }

    public LocalDate getSemaineDu() {
        return semaineDu;
    }

    public void setSemaineDu(LocalDate semaineDu) {
        this.semaineDu = semaineDu;
    }

    public LocalDate getSemaineAu() {
        return semaineAu;
    }

    public void setSemaineAu(LocalDate semaineAu) {
        this.semaineAu = semaineAu;
    }

    public double getHeuresTravaillees() {
        return heuresTravaillees;
    }

    public void setHeuresTravaillees(double heuresTravaillees) {
        this.heuresTravaillees = heuresTravaillees;
    }

    public double getHeuresSupplementaires() {
        return heuresSupplementaires;
    }

    public void setHeuresSupplementaires(double heuresSupplementaires) {
        this.heuresSupplementaires = heuresSupplementaires;
    }

    public double getHeuresAbsence() {
        return heuresAbsence;
    }

    public void setHeuresAbsence(double heuresAbsence) {
        this.heuresAbsence = heuresAbsence;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public String getCommentaireEmploye() {
        return commentaireEmploye;
    }

    public void setCommentaireEmploye(String commentaireEmploye) {
        this.commentaireEmploye = commentaireEmploye;
    }

    public String getCommentaireValideur() {
        return commentaireValideur;
    }

    public void setCommentaireValideur(String commentaireValideur) {
        this.commentaireValideur = commentaireValideur;
    }

    public String getValidePar() {
        return validePar;
    }

    public void setValidePar(String validePar) {
        this.validePar = validePar;
    }

    public LocalDateTime getDateValidation() {
        return dateValidation;
    }

    public void setDateValidation(LocalDateTime dateValidation) {
        this.dateValidation = dateValidation;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }

    public LocalDateTime getDateMiseAJour() {
        return dateMiseAJour;
    }

    public void setDateMiseAJour(LocalDateTime dateMiseAJour) {
        this.dateMiseAJour = dateMiseAJour;
    }

    public List<LigneFeuilleTemps> getLignes() {
        return lignes;
    }

    public void setLignes(List<LigneFeuilleTemps> lignes) {
        this.lignes = lignes;
    }
}
