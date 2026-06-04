package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "utilisateurs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "keycloak_id", nullable = false, unique = true)
    private String keycloakId;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String nom;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String prenom;

    @Email
    @NotBlank
    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 20)
    private String telephone;

    @Column(name = "date_naissance")
    private LocalDate dateNaissance;

    @Column(name = "date_embauche", nullable = false)
    private LocalDate dateEmbauche;

    @Column(name = "date_fin_contrat")
    private LocalDate dateFinContrat;

    @Column(length = 100)
    private String poste;

    @Column(length = 100)
    private String departement;

    @Column(length = 255)
    private String adresse;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relations
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profil_id")
    private Profil profil;

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<FeuilleTemps> feuillesTemps = new ArrayList<>();

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Demande> demandes = new ArrayList<>();

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Reclamation> reclamations = new ArrayList<>();



    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Document> documents = new ArrayList<>();

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Activité> taches = new ArrayList<>();

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Evaluation> evaluations = new ArrayList<>();

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Rapport> rapports = new ArrayList<>();


    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MembreEquipe> membresEquipe = new ArrayList<>();
    // Lifecycle hooks
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Helper method
    public String getNomComplet() {
        return prenom + " " + nom;
    }






    // Ajouter ces champs dans Utilisateur.java après "private String photoUrl;"

    // ══ CHAMPS STAGIAIRE ══

    @Column(name = "universite", length = 150)
    private String universite;

    @Column(name = "specialite", length = 150)
    private String specialite;

    @Column(name = "niveau_etude", length = 50)
    private String niveauEtude;

    @Column(name = "date_debut_stage")
    private LocalDate dateDebutStage;

    @Column(name = "date_fin_stage")
    private LocalDate dateFinStage;

    @Column(name = "date_soutenance")
    private LocalDate dateSoutenance;

    @Column(name = "type_stage_id")
    private Long typeStageId;

    // Relation superviseurs (ManyToMany — un stagiaire peut avoir plusieurs superviseurs)
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "stagiaire_superviseurs",
            joinColumns = @JoinColumn(name = "stagiaire_id"),
            inverseJoinColumns = @JoinColumn(name = "superviseur_id")
    )
    @Builder.Default
    private List<Utilisateur> superviseurs = new ArrayList<>();

    // Relation inverse — stagiaires encadrés par ce superviseur
    @ManyToMany(mappedBy = "superviseurs", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Utilisateur> stagiairesEncadres = new ArrayList<>();
}