// src/main/java/com/talenthub/application_service/DTO/ActiviteDTO.java
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Activité;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActiviteDTO {

    private Long id;
    private String nom;
    private String description;
    private String numeroActivite;
    private String couleur;

    // FK vers nomenclature-service (Long ID)
    private Long statutActiviteId;

    // Enrichis par ActiviteService.toDTO() via appel HTTP nomenclature-service
    private String statutLibelle;
    private String statutCouleur;
    private String statutCode;

    // Finance
    private Double budget;
    private Double quotaHoraire;
    private String typeBudget;

    // Flags
    private boolean visible;
    private boolean facturable;

    // Priorité
    private int priorite;
    private String prioriteLibelle;

    // Dates
    private LocalDate dateEcheance;
    private LocalDate dateDebutReelle;
    private LocalDate dateFinReelle;
    private Double heuresEstimees;
    private Double heuresPassees;

    // Relations
    private Long projetId;
    private String projetNom;
    private Long utilisateurId;
    private String utilisateurNomComplet;
    private String creePar;
    private LocalDateTime dateCreation;
    private LocalDateTime dateMiseAJour;

    // Constructeur depuis entité
    public ActiviteDTO(Activité a) {
        this.id                    = a.getId();
        this.nom                   = a.getNom();
        this.description           = a.getDescription();
        this.numeroActivite        = a.getNumeroActivite();
        this.couleur               = a.getCouleur();
        this.statutActiviteId      = a.getStatutActiviteId();
        // ✅ FIX — Pas de libellé ici (enrichi dans toDTO) mais on met un défaut visible
        // pour ne pas afficher "—" si l'enrichissement échoue
        this.statutLibelle         = null; // sera enrichi dans toDTO
        this.statutCouleur         = "#94a3b8"; // couleur neutre par défaut
        this.statutCode            = "";
        this.budget                = a.getBudget();
        this.quotaHoraire          = a.getQuotaHoraire();
        this.typeBudget            = a.getTypeBudget();
        this.visible               = a.isVisible();
        this.facturable            = a.isFacturable();
        this.priorite              = a.getPriorite();
        this.prioriteLibelle       = resolvePriorite(a.getPriorite());
        this.dateEcheance          = a.getDateEcheance();
        this.dateDebutReelle       = a.getDateDebutReelle();
        this.dateFinReelle         = a.getDateFinReelle();
        this.heuresEstimees        = a.getHeuresEstimees();
        this.heuresPassees         = a.getHeuresPassees();
        this.projetId              = a.getProjet()      != null ? a.getProjet().getId()              : null;
        this.projetNom             = a.getProjet()      != null ? a.getProjet().getNom()             : null;
        this.utilisateurId         = a.getUtilisateur() != null ? a.getUtilisateur().getId()         : null;
        this.utilisateurNomComplet = a.getUtilisateur() != null ? a.getUtilisateur().getNomComplet() : null;
        this.creePar               = a.getCreePar();
        this.dateCreation          = a.getDateCreation();
        this.dateMiseAJour         = a.getDateMiseAJour();
    }

    private static String resolvePriorite(int p) {
        return switch (p) {
            case 1  -> "Basse";
            case 2  -> "Normale";
            case 3  -> "Haute";
            case 4  -> "Urgente";
            default -> "Normale";
        };
    }
}