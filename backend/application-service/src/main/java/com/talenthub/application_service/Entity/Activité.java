// Activité.java — REMPLACE COMPLET
package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "activites")
@Getter @Setter @AllArgsConstructor @Builder(toBuilder = true)
public class Activité {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String nom;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "numero_activite", length = 50)
    private String numeroActivite;

    @Column(length = 7)
    private String couleur;

    @Column(name = "statut_activite_id", nullable = false)
    private Long statutActiviteId = 1L;

    // ── Finance ──
    @Column(name = "budget")
    private Double budget;

    @Column(name = "quota_horaire")
    private Double quotaHoraire;

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

    @Column(name = "est_globale", nullable = false)
    @Builder.Default
    private boolean estGlobale = false;

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Traçabilité de duplication depuis une activité globale.
    //
    // Rempli UNIQUEMENT pour les copies créées via le mécanisme de
    // duplication par projet (scénario B) : quand un employé pointe sur une
    // activité globale "Réunion" dans un projet pour la première fois, une
    // copie locale est créée pour CE projet, et ce champ pointe vers
    // l'activité globale d'origine (Activité.id de l'originale, qui a
    // estGlobale=true).
    //
    // - null pour une activité globale originale (estGlobale=true)
    // - null pour une activité créée normalement (jamais issue d'une
    //   activité globale)
    // - rempli UNIQUEMENT pour une copie locale de projet issue d'une
    //   activité globale
    //
    // Permet de retrouver en une requête "la copie de l'activité globale X
    // dans le projet Y" : WHERE activiteSourceGlobaleId = X AND projet = Y.
    // C'est ce qui garantit l'IDEMPOTENCE de la duplication — sans ce champ,
    // il serait impossible de savoir de façon fiable si une copie existe
    // déjà pour ce projet (chercher par nom serait fragile : deux activités
    // différentes peuvent porter le même nom).
    // ════════════════════════════════════════════════════════════
    @Column(name = "activite_source_globale_id")
    private Long activiteSourceGlobaleId;

    // ── PRIORITÉ — ID vers la table priorite_activite du nomenclature-service ──
    // AVANT : private int priorite = 2;
    // APRÈS : FK vers priorite_activite (stocké comme simple Long, pas de @ManyToOne cross-service)
    @Column(name = "priorite_id")
    private Long prioriteId;

    // ── Dates ──
    @Column(name = "date_echeance")
    private LocalDate dateEcheance;

    @Column(name = "date_debut_reelle")
    private LocalDate dateDebutReelle;

    @Column(name = "date_fin_reelle")
    private LocalDate dateFinReelle;

    // ── Temps ──
    @Column(name = "heures_estimees")
    private Double heuresEstimees;

    @Column(name = "heures_passees")
    @Builder.Default
    private Double heuresPassees = 0.0;

    // ── Metadata ──
    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_mise_a_jour")
    private LocalDateTime dateMiseAJour;

    @ManyToMany(mappedBy = "activites", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Projet> projets = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "activite_groupes",
            joinColumns = @JoinColumn(name = "activite_id"),
            inverseJoinColumns = @JoinColumn(name = "groupe_id")
    )
    @Builder.Default
    private List<Groupe> groupes = new ArrayList<>();

    // Garde l'ancien pour compatibilité (utilisateur principal)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    // NOUVEAU : multi-assignation
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "activite_utilisateurs",
            joinColumns = @JoinColumn(name = "activite_id"),
            inverseJoinColumns = @JoinColumn(name = "utilisateur_id")
    )
    @Builder.Default
    private List<Utilisateur> utilisateurs = new ArrayList<>();


    @Column(name = "cree_par_keycloak_id", length = 100)
    private String creePar;

    @OneToMany(mappedBy = "activite", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Document> documents = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (this.statutActiviteId == null) this.statutActiviteId = 1L;
        this.dateCreation  = LocalDateTime.now();
        this.dateMiseAJour = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.dateMiseAJour = LocalDateTime.now();
    }

    public Activité() {
        this.statutActiviteId = 1L;
        this.typeBudget       = "ILLIMITE";
        this.visible          = true;
        this.facturable       = true;
        this.heuresPassees    = 0.0;
        this.estGlobale       = false;
        this.groupes          = new ArrayList<>();
        this.projets          = new ArrayList<>();
        this.utilisateurs     = new ArrayList<>();
        // prioriteId est null par défaut — sera rempli depuis le formulaire
        // activiteSourceGlobaleId est null par défaut — rempli uniquement
        // lors d'une duplication via obtenirOuDupliquerPourProjet()
    }
}