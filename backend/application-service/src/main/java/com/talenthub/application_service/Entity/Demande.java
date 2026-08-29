package com.talenthub.application_service.Entity;


import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "demandes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Demande {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Référence vers service-nomenclature (pas de FK JPA cross-service) ──
    // ID de TypeDemande dans service-nomenclature
    @NotNull
    @Column(name = "type_demande_id", nullable = false)
    private Long typeDemandeId;

    // ID de StatutDemande dans service-nomenclature
    @NotNull
    @Column(name = "statut_demande_id", nullable = false)
    private Long statutDemandeId;

    // ── Relation locale ──
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    // Demande traitée par (keycloakId du RH/Admin)
    @Column(name = "traite_par_keycloak_id", length = 100)
    private String traitePar;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String sujet;

    @Column(columnDefinition = "TEXT")
    private String description;

    // Pour les congés : dates de début et fin
    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    // Nombre de jours demandés (calculé)
    @Column(name = "nb_jours")
    private Integer nbJours;

    @Column(name = "commentaire_rh", columnDefinition = "TEXT")
    private String commentaireRH;

    @Column(name = "piece_jointe_url", length = 500)
    private String pieceJointeUrl;

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_mise_a_jour")
    private LocalDateTime dateMiseAJour;

    @Column(name = "date_traitement")
    private LocalDateTime dateTraitement;

    @PrePersist
    protected void onCreate() {
        this.dateCreation   = LocalDateTime.now();
        this.dateMiseAJour  = LocalDateTime.now();
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

    public Long getTypeDemandeId() {
        return typeDemandeId;
    }

    public void setTypeDemandeId(Long typeDemandeId) {
        this.typeDemandeId = typeDemandeId;
    }

    public Long getStatutDemandeId() {
        return statutDemandeId;
    }

    public void setStatutDemandeId(Long statutDemandeId) {
        this.statutDemandeId = statutDemandeId;
    }

    public Utilisateur getUtilisateur() {
        return utilisateur;
    }

    public void setUtilisateur(Utilisateur utilisateur) {
        this.utilisateur = utilisateur;
    }

    public String getTraitePar() {
        return traitePar;
    }

    public void setTraitePar(String traitePar) {
        this.traitePar = traitePar;
    }

    public String getSujet() {
        return sujet;
    }

    public void setSujet(String sujet) {
        this.sujet = sujet;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(LocalDate dateDebut) {
        this.dateDebut = dateDebut;
    }

    public LocalDate getDateFin() {
        return dateFin;
    }

    public void setDateFin(LocalDate dateFin) {
        this.dateFin = dateFin;
    }

    public Integer getNbJours() {
        return nbJours;
    }

    public void setNbJours(Integer nbJours) {
        this.nbJours = nbJours;
    }

    public String getCommentaireRH() {
        return commentaireRH;
    }

    public void setCommentaireRH(String commentaireRH) {
        this.commentaireRH = commentaireRH;
    }

    public String getPieceJointeUrl() {
        return pieceJointeUrl;
    }

    public void setPieceJointeUrl(String pieceJointeUrl) {
        this.pieceJointeUrl = pieceJointeUrl;
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

    public LocalDateTime getDateTraitement() {
        return dateTraitement;
    }

    public void setDateTraitement(LocalDateTime dateTraitement) {
        this.dateTraitement = dateTraitement;
    }


    @Column(name = "outlook_event_id", length = 500)
    private String outlookEventId;
}
