// application-service/.../Entity/CommentaireReclamation.java
package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "commentaires_reclamation")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CommentaireReclamation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reclamation_id", nullable = false)
    private Reclamation reclamation;

    /** Keycloak ID de l'auteur du commentaire */
    @Column(name = "auteur_keycloak_id", nullable = false, length = 100)
    private String auteurKeycloakId;

    /** Nom affiché de l'auteur (prénom nom) */
    @Column(name = "auteur_nom", length = 100)
    private String auteurNom;

    /** true = commentaire du traiteur/admin, false = commentaire du demandeur */
    @Column(name = "est_admin", nullable = false)
    private boolean estAdmin = false;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenu;

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @PrePersist
    protected void onCreate() { this.dateCreation = LocalDateTime.now(); }
}