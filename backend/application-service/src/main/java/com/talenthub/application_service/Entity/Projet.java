// src/main/java/com/talenthub/application_service/Entity/Projet.java
package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "projets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Projet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String nom;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "numero_projet", unique = true, length = 50)
    private String numeroProjet;    // ex: "PRJ-2024-001"

    @Column(length = 7)
    private String couleur;         // ex: "#c026d3"

    // ── Dates ──
    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Column(name = "date_fin_reelle")
    private LocalDate dateFinReelle;

    // ── Statut ──
    // PLANIFIE | EN_COURS | SUSPENDU | TERMINE | ANNULE
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String statut = "PLANIFIE";

    @Column(nullable = false)
    @Builder.Default
    private int avancement = 0;

    // ── Finance ──
    @Column(name = "budget_prevu")
    private Double budgetPrevu;

    @Column(name = "budget_consomme")
    @Builder.Default
    private Double budgetConsomme = 0.0;

    @Column(name = "quota_horaire")
    private Double quotaHoraire;

    // MENSUEL | TRIMESTRIEL | ANNUEL | ILLIMITE
    @Column(name = "type_budget", length = 20)
    @Builder.Default
    private String typeBudget = "ILLIMITE";

    // ── Flags ──
    @Column(nullable = false)
    @Builder.Default
    private boolean visible = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean facturable = true;

    @Column(name = "autoriser_activites_globales", nullable = false)
    @Builder.Default
    private boolean autoriserActivitesGlobales = false;

    // ── Admin du projet (keycloakId du responsable principal) ──
    @Column(name = "responsable_keycloak_id", length = 100)
    private String responsableKeycloakId;

    // ── Liste des admins du projet (keycloakId séparés par virgule
    //    ou relation Many-to-Many si préféré) ──
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "projet_admins",
            joinColumns = @JoinColumn(name = "projet_id"))
    @Column(name = "keycloak_id", length = 100)
    @Builder.Default
    private List<String> projetAdmins = new ArrayList<>();

    // ── Metadata ──
    @Column(name = "date_creation", updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_mise_a_jour")
    private LocalDateTime dateMiseAJour;

    // ── Relations ──

    /** Client propriétaire du projet */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client;

    /** Membres de l'équipe (table porteuse MembreEquipe) */
    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MembreEquipe> membres = new ArrayList<>();

    /** Activités du projet */
    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Activité> activites = new ArrayList<>();

    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Document> documents = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.dateCreation  = LocalDateTime.now();
        this.dateMiseAJour = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.dateMiseAJour = LocalDateTime.now();
    }
}