// src/main/java/com/talenthub/application_service/Entity/Commentaire.java
package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "commentaires")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Commentaire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ✅ Contenu du commentaire
    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenu;

    // ✅ Auteur (keycloakId de l'utilisateur connecté)
    @Column(name = "auteur_keycloak_id", nullable = false, length = 100)
    private String auteurKeycloakId;

    // ✅ Nom affiché (dénormalisé pour éviter un appel HTTP)
    @Column(name = "auteur_nom", length = 150)
    private String auteurNom;

    @Column(name = "auteur_photo_url", length = 500)
    private String auteurPhotoUrl;

    // ✅ Lié à un projet OU une activité (nullable, l'un des deux est renseigné)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projet_id")
    private Projet projet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activite_id")
    private Activité activite;

    // ✅ Groupe concerné (optionnel — commentaire d'équipe)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "groupe_id")
    private Groupe groupe;

    @Column(name = "date_creation", updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_mise_a_jour")
    private LocalDateTime dateMiseAJour;

    @Column(name = "edite")
    @Builder.Default
    private boolean edite = false;

    @PrePersist
    protected void onCreate() {
        this.dateCreation  = LocalDateTime.now();
        this.dateMiseAJour = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.dateMiseAJour = LocalDateTime.now();
        this.edite = true;
    }
}