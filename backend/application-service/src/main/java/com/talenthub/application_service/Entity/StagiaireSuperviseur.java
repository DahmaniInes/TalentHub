package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "stagiaire_superviseurs",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"stagiaire_id", "superviseur_id", "date_debut"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StagiaireSuperviseur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Le stagiaire encadré
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stagiaire_id", nullable = false)
    private Utilisateur stagiaire;

    // Le superviseur qui encadre
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "superviseur_id", nullable = false)
    private Utilisateur superviseur;

    // Lié à quel stage précisément
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private Stage stage;

    // Période d'encadrement (permet les requêtes historiques)
    @Column(name = "date_debut")
    private LocalDate dateDebut;

    @Column(name = "date_fin")
    private LocalDate dateFin;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }
}