package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "activite_stage")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActiviteStage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String titre;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Column(nullable = false)
    @Builder.Default
    private Integer avancement = 0; // 0-100

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String statut = "A_FAIRE"; // A_FAIRE, EN_COURS, TERMINE

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Projet auquel appartient cette activité
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projet_id", nullable = false)
    private ProjetStage projet;

    // Créateur de l'activité (stagiaire ou superviseur)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "createur_id")
    private Utilisateur createur;

    // Assigné à (stagiaire)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigne_id")
    private Utilisateur assigne;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}