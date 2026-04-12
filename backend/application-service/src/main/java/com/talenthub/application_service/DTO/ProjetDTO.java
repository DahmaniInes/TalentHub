package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Projet;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjetDTO {

    private Long id;
    private String nom;
    private String description;
    private String numeroProjet;
    private String couleur;
    // Client
    private Long clientId;
    private String clientNom;
    // Dates
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private LocalDate dateFinReelle;
    // Statut
    private String statut;
    private int avancement;
    // Finance
    private Double budgetPrevu;
    private Double budgetConsomme;
    private Double quotaHoraire;
    private String typeBudget;
    // Flags
    private boolean visible;
    private boolean facturable;
    private boolean autoriserActivitesGlobales;
    // Équipe
    private String responsableKeycloakId;
    private List<String> projetAdmins;
    private int nombreMembres;
    private int nombreActivites;
    private LocalDateTime dateCreation;

    public ProjetDTO(Projet p) {
        this.id                          = p.getId();
        this.nom                         = p.getNom();
        this.description                 = p.getDescription();
        this.numeroProjet                = p.getNumeroProjet();
        this.couleur                     = p.getCouleur();
        this.clientId                    = p.getClient() != null ? p.getClient().getId() : null;
        this.clientNom                   = p.getClient() != null ? p.getClient().getNom() : null;
        this.dateDebut                   = p.getDateDebut();
        this.dateFin                     = p.getDateFin();
        this.dateFinReelle               = p.getDateFinReelle();
        this.statut                      = p.getStatut();
        this.avancement                  = p.getAvancement();
        this.budgetPrevu                 = p.getBudgetPrevu();
        this.budgetConsomme              = p.getBudgetConsomme();
        this.quotaHoraire                = p.getQuotaHoraire();
        this.typeBudget                  = p.getTypeBudget();
        this.visible                     = p.isVisible();
        this.facturable                  = p.isFacturable();
        this.autoriserActivitesGlobales  = p.isAutoriserActivitesGlobales();
        this.responsableKeycloakId       = p.getResponsableKeycloakId();
        this.projetAdmins                = p.getProjetAdmins();
        this.nombreMembres               = p.getMembres() != null ? p.getMembres().size() : 0;
        this.nombreActivites             = p.getActivites() != null ? p.getActivites().size() : 0;
        this.dateCreation                = p.getDateCreation();
    }
}
