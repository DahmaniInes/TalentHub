// src/main/java/com/talenthub/application_service/Entity/MembreEquipe.java
package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Table porteuse entre Projet et Utilisateur.
 * Représente l'équipe qui travaille sur un projet.
 */
@Entity
@Table(name = "membres_equipe",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"projet_id", "utilisateur_id"}
        ))
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

    // Rôle dans le projet : MEMBRE | LEAD | OBSERVATEUR | ADMIN
    @Column(length = 30)
    @Builder.Default
    private String role = "MEMBRE";

    // Quota horaire spécifique au membre sur ce projet (optionnel)
    @Column(name = "quota_horaire")
    private Double quotaHoraire;

    @Column(name = "date_ajout", updatable = false)
    private LocalDateTime dateAjout;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    @PrePersist
    protected void onCreate() {
        this.dateAjout = LocalDateTime.now();
    }
}