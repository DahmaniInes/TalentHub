// src/main/java/com/talenthub/application_service/DTO/ProjetDTO.java
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.Projet;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
public class ProjetDTO {

    private Long    id;
    private String  nom;
    private String  description;
    private String  numeroProjet;
    private String  couleur;
    private Long    clientId;
    private String  clientNom;
    private String  dateDebut;
    private String  dateFin;
    private String  dateFinReelle;
    private String  statut;
    private int     avancement;
    private Double  budgetPrevu;
    private Double  budgetConsomme;
    private Double  quotaHoraire;
    private String  typeBudget;
    private Integer seuilAlerteHoraire;
    private boolean visible;
    private boolean facturable;
    private boolean autoriserActivitesGlobales;
    private String  responsableKeycloakId;
    private List<String>   projetAdmins = new ArrayList<>();
    private int            nombreMembres;
    private int            nombreActivites;
    private List<GroupeInfoDTO> groupes = new ArrayList<>();
    private String dateCreation;

    @Data
    @NoArgsConstructor
    public static class GroupeInfoDTO {
        private Long    id;
        private String  nom;
        private String  couleur;
        private int     nombreMembres;
        private int     nombreProjetsActifs; // enrichi par ProjetService.toDTO()

        // ✅ Constructeur depuis l'entité Groupe
        public GroupeInfoDTO(Groupe g) {
            this.id     = g.getId();
            this.nom    = g.getNom();
            this.couleur = g.getCouleur();
            // nombreMembres : accès sécurisé (peut être lazy non chargé)
            try {
                this.nombreMembres = g.getMembres() != null ? g.getMembres().size() : 0;
            } catch (Exception e) {
                this.nombreMembres = 0;
            }
            this.nombreProjetsActifs = 0; // sera enrichi par le service
        }
    }

    // ✅ Constructeur principal — ROBUSTE : chaque accès lazy est protégé
    public ProjetDTO(Projet p) {
        this.id          = p.getId();
        this.nom         = p.getNom();
        this.description = p.getDescription();
        this.numeroProjet = p.getNumeroProjet();
        this.couleur     = p.getCouleur();
        this.statut      = p.getStatut();
        this.avancement  = p.getAvancement();
        this.budgetPrevu = p.getBudgetPrevu();
        this.budgetConsomme = p.getBudgetConsomme();
        this.quotaHoraire   = p.getQuotaHoraire();
        this.typeBudget     = p.getTypeBudget();
        this.seuilAlerteHoraire = p.getSeuilAlerteHoraire();
        this.visible     = p.isVisible();
        this.facturable  = p.isFacturable();
        this.autoriserActivitesGlobales = p.isAutoriserActivitesGlobales();
        this.responsableKeycloakId = p.getResponsableKeycloakId();

        // Dates → String
        this.dateDebut    = p.getDateDebut() != null    ? p.getDateDebut().toString()    : null;
        this.dateFin      = p.getDateFin() != null      ? p.getDateFin().toString()      : null;
        this.dateFinReelle = p.getDateFinReelle() != null ? p.getDateFinReelle().toString() : null;
        this.dateCreation  = p.getDateCreation() != null  ? p.getDateCreation().toString()  : null;

        // Client
        try {
            if (p.getClient() != null) {
                this.clientId  = p.getClient().getId();
                this.clientNom = p.getClient().getNom();
            }
        } catch (Exception ignored) {}

        // projetAdmins
        try {
            this.projetAdmins = p.getProjetAdmins() != null ? p.getProjetAdmins() : new ArrayList<>();
        } catch (Exception ignored) { this.projetAdmins = new ArrayList<>(); }

        // Membres du projet (pour nombreMembres)
        try {
            this.nombreMembres = p.getMembres() != null ? p.getMembres().size() : 0;
        } catch (Exception ignored) { this.nombreMembres = 0; }

        // Activités du projet (pour nombreActivites)
        try {
            this.nombreActivites = p.getActivites() != null ? p.getActivites().size() : 0;
        } catch (Exception ignored) { this.nombreActivites = 0; }

        // ✅ Groupes — accès direct (doivent être fetch eagerly via findByIdWithDetails)
        try {
            if (p.getGroupes() != null && !p.getGroupes().isEmpty()) {
                this.groupes = p.getGroupes().stream()
                        .map(GroupeInfoDTO::new)
                        .toList();
            }
        } catch (Exception ignored) { this.groupes = new ArrayList<>(); }
    }
}