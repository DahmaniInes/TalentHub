// src/main/java/com/talenthub/application_service/Entity/Client.java
package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "clients")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Identification ──
    @NotBlank
    @Column(nullable = false, length = 200)
    private String nom;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String compte;          // Nom du compte / référence comptable

    @Column(name = "id_tva", length = 50)
    private String idTva;

    @Column(length = 10)
    private String devise;          // EUR, USD, TND…

    @Column(length = 7)
    private String couleur;         // ex: "#c026d3"

    // ── Contact ──
    @Column(length = 200)
    private String contact;         // Nom du contact principal

    @Email
    @Column(length = 200)
    private String courriel;

    @Column(name = "page_accueil", length = 255)
    private String pageAccueil;     // URL site web

    @Column(length = 20)
    private String mobile;

    @Column(length = 20)
    private String telephone;

    @Column(length = 20)
    private String fax;

    // ── Finance ──
    @Column(name = "budget")
    private Double budget;

    @Column(name = "quota_horaire")
    private Double quotaHoraire;

    // MENSUEL | TRIMESTRIEL | ANNUEL | ILLIMITE
    @Column(name = "type_budget", length = 20)
    @Builder.Default
    private String typeBudget = "MENSUEL";

    // ── Adresse ──
    @Column(name = "nom_societe", length = 200)
    private String nomSociete;

    @Column(name = "code_postal", length = 20)
    private String codePostal;

    @Column(length = 100)
    private String ville;

    @Column(length = 100)
    private String pays;

    @Column(name = "fuseau_horaire", length = 60)
    @Builder.Default
    private String fuseauHoraire = "Africa/Tunis";

    // ── Flags ──
    @Column(nullable = false)
    @Builder.Default
    private boolean visible = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean facturable = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    // ── Metadata ──
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Relations ──
    @OneToMany(mappedBy = "client", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Projet> projets = new ArrayList<>();

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