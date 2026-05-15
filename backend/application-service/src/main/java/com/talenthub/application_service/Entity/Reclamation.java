// application-service/.../Entity/Reclamation.java
package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "reclamations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Reclamation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** ID du service concerné (dans nomenclature-service, table reclamation_service) */
    @NotNull
    @Column(name = "service_reclamation_id", nullable = false)
    private Long serviceReclamationId;

    /** ID du statut courant (dans nomenclature-service, table reclamation_statut) */
    @NotNull
    @Column(name = "statut_reclamation_id", nullable = false)
    private Long statutReclamationId;

    /** Utilisateur qui a soumis la réclamation */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    /** Keycloak ID de l'agent qui a traité la réclamation */
    @Column(name = "traite_par_keycloak_id", length = 100)
    private String traitePar;

    @NotBlank
    @Column(nullable = false, length = 200)
    private String sujet;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** URL Cloudinary du document / image joint */
    @Column(name = "piece_jointe_url", length = 500)
    private String pieceJointeUrl;

    /** Commentaire laissé par le traiteur lors de la résolution */
    @Column(name = "commentaire_traitement", columnDefinition = "TEXT")
    private String commentaireTraitement;

    /** Conversation : commentaires multiples (utilisateur + traiteur) */
    @OneToMany(mappedBy = "reclamation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @OrderBy("dateCreation ASC")
    private List<CommentaireReclamation> commentaires = new ArrayList<>();

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_mise_a_jour")
    private LocalDateTime dateMiseAJour;

    @Column(name = "date_traitement")
    private LocalDateTime dateTraitement;

    @PrePersist
    protected void onCreate() {
        this.dateCreation  = LocalDateTime.now();
        this.dateMiseAJour = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() { this.dateMiseAJour = LocalDateTime.now(); }
}