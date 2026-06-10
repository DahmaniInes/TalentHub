package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "stages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Stage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    // Type de stage (ID vers nomenclature-service)
    @Column(name = "type_stage_id")
    private Long typeStageId;

    // ✅ NOUVEAU — Statut via nomenclature-service (remplace le String statut)
    @Column(name = "statut_stage_id")
    private Long statutStageId; // pointe vers statut_stage dans nomenclature

    // Garde le String pour compatibilité transitoire


    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Column(name = "date_soutenance")
    private LocalDate dateSoutenance;

    @Column(length = 500)
    private String description;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // ✅ NOUVEAU — Relation inverse vers MembreEquipe
    // Permet de savoir sur quels projets ce stage a travaillé
    @OneToMany(mappedBy = "stage", cascade = CascadeType.ALL,
            fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<MembreEquipe> affectationsProjets = new ArrayList<>();

    @OneToMany(mappedBy = "stage", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Document> documents = new ArrayList<>();

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }




}