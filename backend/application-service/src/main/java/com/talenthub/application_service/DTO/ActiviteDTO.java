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

    // ✅ ID du statut (FK vers nomenclature-service)
    private Long statutActiviteId;

    // ✅ Libellé et couleur du statut — enrichis par le service via appel HTTP à nomenclature
    // Ces champs sont null si l'enrichissement n'est pas fait (mode dégradé)
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

    // Priorité et dates
    private int priorite;
    private String prioriteLibelle; // enrichi en mémoire
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

    // ✅ Constructeur depuis entité — sans enum, sans appel distant
    public ActiviteDTO(Activité a) {
        this.id                    = a.getId();
        this.nom                   = a.getNom();
        this.description           = a.getDescription();
        this.numeroActivite        = a.getNumeroActivite();
        this.couleur               = a.getCouleur();
        this.statutActiviteId      = a.getStatutActiviteId();
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
        this.projetId              = a.getProjet()      != null ? a.getProjet().getId()               : null;
        this.projetNom             = a.getProjet()      != null ? a.getProjet().getNom()              : null;
        this.utilisateurId         = a.getUtilisateur() != null ? a.getUtilisateur().getId()          : null;
        this.utilisateurNomComplet = a.getUtilisateur() != null ? a.getUtilisateur().getNomComplet()  : null;
        this.creePar               = a.getCreePar();
        this.dateCreation          = a.getDateCreation();
        this.dateMiseAJour         = a.getDateMiseAJour();
    }

    // Utilitaire statique — pas d'appel distant
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