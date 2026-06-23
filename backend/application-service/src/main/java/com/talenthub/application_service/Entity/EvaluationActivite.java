// Entity/EvaluationActivite.java — NOUVEAU
package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Évaluation d'une activité de stage par un superviseur.
 *
 * Règle métier : un même évaluateur (superviseur) ne peut avoir qu'UNE seule
 * évaluation active par activité — contrainte unique (activite_id, evaluateur_keycloak_id).
 * Il peut la modifier (note + commentaire), mais pas en créer une deuxième pour
 * la même activité. Plusieurs superviseurs différents peuvent chacun évaluer
 * la même activité indépendamment (utile si un stagiaire a plusieurs superviseurs).
 */
@Entity
@Table(name = "evaluations_activite",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_eval_activite_evaluateur",
                columnNames = {"activite_id", "evaluateur_keycloak_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EvaluationActivite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activite_id", nullable = false)
    private Activité activite;

    // ── Évaluateur (le superviseur qui note) ──
    // Stocké en keycloakId (cohérent avec Commentaire.auteurKeycloakId) plutôt
    // qu'une FK Utilisateur, pour rester aligné avec le pattern déjà utilisé
    // ailleurs dans l'app pour identifier "qui a fait l'action".
    @Column(name = "evaluateur_keycloak_id", nullable = false, length = 100)
    private String evaluateurKeycloakId;

    @Column(name = "evaluateur_nom", length = 200)
    private String evaluateurNom;

    // ── Note 0 à 5 (étoiles entières) ──
    @Min(0) @Max(5)
    @Column(nullable = false)
    private Integer note;

    // ── Commentaire libre, optionnel ──
    @Column(columnDefinition = "TEXT")
    private String commentaire;

    @Column(name = "date_creation", updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_mise_a_jour")
    private LocalDateTime dateMiseAJour;

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