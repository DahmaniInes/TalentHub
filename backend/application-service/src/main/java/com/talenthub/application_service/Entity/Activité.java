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

    // ✅ NOUVEAU — activité globale (pas liée à un projet spécifique)
    @Column(name = "est_globale", nullable = false)
    @Builder.Default
    private boolean estGlobale = false;

    // ── Priorité ──
    @Column(nullable = false)
    @Builder.Default
    private int priorite = 2;

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

    // ✅ SUPPRIMÉ : @ManyToOne projet — le lien se fait maintenant côté Projet
    // La relation est bidirectionnelle via projet_activites (Many-to-Many)
    // On garde une référence read-only pour savoir à quels projets appartient cette activité
    @ManyToMany(mappedBy = "activites", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Projet> projets = new ArrayList<>();

    // ✅ Groupes assignés à cette activité
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "activite_groupes",
            joinColumns = @JoinColumn(name = "activite_id"),
            inverseJoinColumns = @JoinColumn(name = "groupe_id")
    )
    @Builder.Default
    private List<Groupe> groupes = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    @Column(name = "cree_par_keycloak_id", length = 100)
    private String creePar;

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
        this.priorite         = 2;
        this.heuresPassees    = 0.0;
        this.estGlobale       = false;
        this.groupes          = new ArrayList<>();
        this.projets          = new ArrayList<>();
    }
}