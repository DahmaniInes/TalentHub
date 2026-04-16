// src/main/java/com/talenthub/application_service/Entity/Activité.java
package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "activites")
@Getter @Setter  @AllArgsConstructor
@Builder(toBuilder = true)  // ← Ajouter toBuilder = true

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
   // @Builder.Default
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

    // ── Relations ──
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projet_id")
    private Projet projet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    @Column(name = "cree_par_keycloak_id", length = 100)
    private String creePar;

    @PrePersist
    protected void onCreate() {
        // ✅ FIX 2 — Garantir que statutActiviteId n'est jamais null à la persistance
        if (this.statutActiviteId == null) {
            this.statutActiviteId = 1L;
        }
        this.dateCreation  = LocalDateTime.now();
        this.dateMiseAJour = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.dateMiseAJour = LocalDateTime.now();
    }



    public Activité() {
        this.statutActiviteId = 1L;
        this.typeBudget = "ILLIMITE";
        this.visible = true;
        this.facturable = true;
        this.priorite = 2;
        this.heuresPassees = 0.0;
    }


}