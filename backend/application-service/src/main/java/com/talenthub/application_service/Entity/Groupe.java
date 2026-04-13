// src/main/java/com/talenthub/application_service/Entity/Groupe.java
package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "groupes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Groupe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 100, unique = true)
    private String nom;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 7)
    @Builder.Default
    private String couleur = "#6366f1";  // ex: "#c026d3"

    // Team Lead — keycloakId de l'utilisateur responsable
    @Column(name = "team_lead_id")
    private Long teamLeadId;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Membres du groupe (relation Many-to-Many via table groupe_utilisateurs)
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "groupe_utilisateurs",
            joinColumns = @JoinColumn(name = "groupe_id"),
            inverseJoinColumns = @JoinColumn(name = "utilisateur_id")
    )
    @Builder.Default
    private List<Utilisateur> membres = new ArrayList<>();

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