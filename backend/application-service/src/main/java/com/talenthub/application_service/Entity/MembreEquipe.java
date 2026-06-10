package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "membres_equipe",
        uniqueConstraints = @UniqueConstraint(columnNames = {"projet_id", "utilisateur_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MembreEquipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projet_id", nullable = false)
    private Projet projet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    // ✅ NOUVEAU — lien optionnel vers le Stage
    // Si null : c'est un employé normal sur le projet
    // Si renseigné : c'est un stagiaire, rattaché à une session de stage précise


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private Stage stage;

    @Column(length = 30)
    @Builder.Default
    private String role = "MEMBRE"; // MEMBRE | LEAD | OBSERVATEUR | ADMIN | STAGIAIRE

    @Column(name = "quota_horaire")
    private Double quotaHoraire;

    @Column(name = "date_ajout", updatable = false)
    private LocalDateTime dateAjout;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    @PrePersist
    protected void onCreate() { this.dateAjout = LocalDateTime.now(); }
}