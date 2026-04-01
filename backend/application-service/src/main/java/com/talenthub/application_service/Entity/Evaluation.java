package com.talenthub.application_service.Entity;


import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Employé évalué
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    // keycloakId de l'évaluateur (Manager ou RH)
    @NotBlank
    @Column(name = "evaluateur_keycloak_id", nullable = false, length = 100)
    private String evaluateurKeycloakId;

    @Column(name = "evaluateur_nom", length = 150)
    private String evaluateurNom; // dénormalisé pour éviter l'appel Feign à chaque lecture

    // Note globale /20
    @Min(0) @Max(20)
    @Column(nullable = false)
    private int noteGlobale;

    // Notes par critère (/20)
    @Column(name = "note_competences")
    private Integer noteCompetences;

    @Column(name = "note_ponctualite")
    private Integer notePonctualite;

    @Column(name = "note_travail_equipe")
    private Integer noteTravailEquipe;

    @Column(name = "note_initiative")
    private Integer noteInitiative;

    @Column(name = "note_qualite_travail")
    private Integer noteQualiteTravail;

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "points_forts", columnDefinition = "TEXT")
    private String pointsForts;

    @Column(name = "axes_amelioration", columnDefinition = "TEXT")
    private String axesAmelioration;

    @Column(name = "objectifs_suivant", columnDefinition = "TEXT")
    private String objectifsSuivant;

    // Période évaluée (ex: 2026-Q1)
    @Column(name = "periode_eval", nullable = false)
    private LocalDate periodeEval;

    // BROUILLON | SOUMISE | VALIDEE
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String statut = "BROUILLON";

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_mise_a_jour")
    private LocalDateTime dateMiseAJour;

    @Column(name = "date_validation")
    private LocalDateTime dateValidation;

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

    public String getEvaluateurKeycloakId() {
        return evaluateurKeycloakId;
    }

    public void setEvaluateurKeycloakId(String evaluateurKeycloakId) {
        this.evaluateurKeycloakId = evaluateurKeycloakId;
    }

    public String getEvaluateurNom() {
        return evaluateurNom;
    }

    public void setEvaluateurNom(String evaluateurNom) {
        this.evaluateurNom = evaluateurNom;
    }

    public int getNoteGlobale() {
        return noteGlobale;
    }

    public void setNoteGlobale(int noteGlobale) {
        this.noteGlobale = noteGlobale;
    }

    public Integer getNoteCompetences() {
        return noteCompetences;
    }

    public void setNoteCompetences(Integer noteCompetences) {
        this.noteCompetences = noteCompetences;
    }

    public Integer getNotePonctualite() {
        return notePonctualite;
    }

    public void setNotePonctualite(Integer notePonctualite) {
        this.notePonctualite = notePonctualite;
    }

    public Integer getNoteTravailEquipe() {
        return noteTravailEquipe;
    }

    public void setNoteTravailEquipe(Integer noteTravailEquipe) {
        this.noteTravailEquipe = noteTravailEquipe;
    }

    public Integer getNoteInitiative() {
        return noteInitiative;
    }

    public void setNoteInitiative(Integer noteInitiative) {
        this.noteInitiative = noteInitiative;
    }

    public Integer getNoteQualiteTravail() {
        return noteQualiteTravail;
    }

    public void setNoteQualiteTravail(Integer noteQualiteTravail) {
        this.noteQualiteTravail = noteQualiteTravail;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public String getPointsForts() {
        return pointsForts;
    }

    public void setPointsForts(String pointsForts) {
        this.pointsForts = pointsForts;
    }

    public String getAxesAmelioration() {
        return axesAmelioration;
    }

    public void setAxesAmelioration(String axesAmelioration) {
        this.axesAmelioration = axesAmelioration;
    }

    public String getObjectifsSuivant() {
        return objectifsSuivant;
    }

    public void setObjectifsSuivant(String objectifsSuivant) {
        this.objectifsSuivant = objectifsSuivant;
    }

    public LocalDate getPeriodeEval() {
        return periodeEval;
    }

    public void setPeriodeEval(LocalDate periodeEval) {
        this.periodeEval = periodeEval;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
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

    public LocalDateTime getDateValidation() {
        return dateValidation;
    }

    public void setDateValidation(LocalDateTime dateValidation) {
        this.dateValidation = dateValidation;
    }
}
