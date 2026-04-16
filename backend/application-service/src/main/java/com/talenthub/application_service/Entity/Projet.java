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
    private String numeroProjet;

    @Column(length = 7)
    private String couleur;

    // ── Dates ──
    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Column(name = "date_fin_reelle")
    private LocalDate dateFinReelle;

    // ── Statut ──
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

    @Column(name = "type_budget", length = 20)
    @Builder.Default
    private String typeBudget = "ILLIMITE";

    // ────────────────────────────────────────────────────────────
    // ✅ NOUVEAU — Seuil d'alerte automatique (en pourcentage 0-100)
    // Ex: 80 = envoyer une alerte quand l'équipe a consommé 80%
    // du quota horaire alloué au projet
    // ────────────────────────────────────────────────────────────
    @Column(name = "seuil_alerte_horaire")
    @Builder.Default
    private Integer seuilAlerteHoraire = 80;   // défaut : 80%

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

    // ── Admin du projet ──
    @Column(name = "responsable_keycloak_id", length = 100)
    private String responsableKeycloakId;

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
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client;

    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MembreEquipe> membres = new ArrayList<>();

    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Activité> activites = new ArrayList<>();

    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Document> documents = new ArrayList<>();

    // ────────────────────────────────────────────────────────────
    // ✅ NOUVEAU — Groupes/équipes assignés à ce projet
    // Relation Many-to-Many avec Groupe
    // Table de jointure : projet_groupes
    // ────────────────────────────────────────────────────────────
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "projet_groupes",
            joinColumns = @JoinColumn(name = "projet_id"),
            inverseJoinColumns = @JoinColumn(name = "groupe_id")
    )
    @Builder.Default
    private List<Groupe> groupes = new ArrayList<>();

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