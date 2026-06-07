package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "projet_stage")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjetStage {

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
    private String statut = "EN_COURS"; // EN_COURS, TERMINE, SUSPENDU

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Stagiaires assignés à ce projet
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "projet_stage_stagiaires",
            joinColumns = @JoinColumn(name = "projet_id"),
            inverseJoinColumns = @JoinColumn(name = "stagiaire_id")
    )
    @Builder.Default
    private List<Utilisateur> stagiaires = new ArrayList<>();

    @OneToMany(mappedBy = "projet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ActiviteStage> activites = new ArrayList<>();

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