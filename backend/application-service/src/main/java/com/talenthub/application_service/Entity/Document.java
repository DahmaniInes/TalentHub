package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    // Projet optionnel — un document peut ne pas être lié à un projet
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projet_id")
    private Projet projet;

    // ID de TypeDocument dans service-nomenclature
    @NotNull
    @Column(name = "type_document_id", nullable = false)
    private Long typeDocumentId;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String nom; // nom affiché

    @NotBlank
    @Column(name = "nom_fichier", nullable = false, length = 255)
    private String nomFichier; // nom réel du fichier

    @Column(name = "chemin_fichier", nullable = false, length = 500)
    private String cheminFichier; // chemin dans le stockage (MinIO/S3/local)

    @Column(name = "type_mime", length = 100)
    private String typeMime; // ex: "application/pdf"

    @Column(name = "taille_fichier")
    private Long tailleFichier; // en octets

    @Column(name = "version", nullable = false)
    @Builder.Default
    private int version = 1;

    // ACTIF | ARCHIVE | SUPPRIME
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String statut = "ACTIF";

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "est_confidentiel", nullable = false)
    @Builder.Default
    private boolean estConfidentiel = false;

    @Column(name = "date_upload", nullable = false, updatable = false)
    private LocalDateTime dateUpload;

    @Column(name = "date_expiration")
    private LocalDateTime dateExpiration;

    @PrePersist
    protected void onCreate() {
        this.dateUpload = LocalDateTime.now();
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

    public Projet getProjet() {
        return projet;
    }

    public void setProjet(Projet projet) {
        this.projet = projet;
    }

    public Long getTypeDocumentId() {
        return typeDocumentId;
    }

    public void setTypeDocumentId(Long typeDocumentId) {
        this.typeDocumentId = typeDocumentId;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getNomFichier() {
        return nomFichier;
    }

    public void setNomFichier(String nomFichier) {
        this.nomFichier = nomFichier;
    }

    public String getCheminFichier() {
        return cheminFichier;
    }

    public void setCheminFichier(String cheminFichier) {
        this.cheminFichier = cheminFichier;
    }

    public String getTypeMime() {
        return typeMime;
    }

    public void setTypeMime(String typeMime) {
        this.typeMime = typeMime;
    }

    public Long getTailleFichier() {
        return tailleFichier;
    }

    public void setTailleFichier(Long tailleFichier) {
        this.tailleFichier = tailleFichier;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isEstConfidentiel() {
        return estConfidentiel;
    }

    public void setEstConfidentiel(boolean estConfidentiel) {
        this.estConfidentiel = estConfidentiel;
    }

    public LocalDateTime getDateUpload() {
        return dateUpload;
    }

    public void setDateUpload(LocalDateTime dateUpload) {
        this.dateUpload = dateUpload;
    }

    public LocalDateTime getDateExpiration() {
        return dateExpiration;
    }

    public void setDateExpiration(LocalDateTime dateExpiration) {
        this.dateExpiration = dateExpiration;
    }



    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private Stage stage;
}
