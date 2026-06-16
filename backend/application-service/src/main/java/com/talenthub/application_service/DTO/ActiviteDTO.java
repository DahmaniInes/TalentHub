// ActiviteDTO.java — REMPLACE COMPLET
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Entity.Utilisateur;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActiviteDTO {

    private Long   id;
    private String nom;
    private String description;
    private String numeroActivite;
    private String couleur;

    private Long   statutActiviteId;
    private String statutLibelle;
    private String statutCouleur;
    private String statutCode;

    private Double budget;
    private Double quotaHoraire;
    private String typeBudget;

    private boolean visible;
    private boolean facturable;
    private boolean estGlobale;

    // ── PRIORITÉ dynamique (remplace int priorite) ──
    // Envoyé au frontend tel quel — enrichi dans toDTO() par appel au nomenclature-service
    private Long   prioriteId;       // FK vers priorite_activite
    private String prioriteLibelle;  // ex: "Haute"
    private String prioriteCouleur;  // ex: "#f97316"
    private String prioriteCode;     // ex: "HAUTE"

    private LocalDate     dateEcheance;
    private LocalDate     dateDebutReelle;
    private LocalDate     dateFinReelle;
    private Double        heuresEstimees;
    private Double        heuresPassees;

    private List<ProjetInfoDTO> projets = new ArrayList<>();

    private Long   utilisateurId;
    private String utilisateurNomComplet;
    private String utilisateurPhotoUrl;
    private String utilisateurPoste;
    // Multi-assignation
    private List<UtilisateurMinDTO> utilisateurs = new ArrayList<>();

    @Data @NoArgsConstructor
    public static class UtilisateurMinDTO {
        private Long   id;
        private String nomComplet;
        private String photoUrl;
        private String poste;

        public UtilisateurMinDTO(Utilisateur u) {
            this.id = u.getId();
            this.nomComplet = u.getNomComplet();
            this.photoUrl = u.getPhotoUrl();
            this.poste = u.getPoste();
        }
    }
    private List<GroupeInfoDTO> groupes = new ArrayList<>();

    private String        creePar;
    private LocalDateTime dateCreation;
    private LocalDateTime dateMiseAJour;

    private Integer nombreCommentaires;
    private Integer nombreDocuments;

    // ── DTOs imbriqués ──

    @Data @NoArgsConstructor
    public static class ProjetInfoDTO {
        private Long   id;
        private String nom;
        private String couleur;
        private String numeroProjet;

        public ProjetInfoDTO(Projet p) {
            this.id           = p.getId();
            this.nom          = p.getNom();
            this.couleur      = p.getCouleur();
            this.numeroProjet = p.getNumeroProjet();
        }
    }

    @Data @NoArgsConstructor
    public static class GroupeInfoDTO {
        private Long   id;
        private String nom;
        private String couleur;

        // Dans ActiviteDTO.java — ajouter ces deux champs
        private int nombreCommentaires;
        private int nombreDocuments;

        public GroupeInfoDTO(Groupe g) {
            this.id      = g.getId();
            this.nom     = g.getNom();
            this.couleur = g.getCouleur();
        }
    }

    // ── Constructeur depuis entité ──
    // Note : prioriteLibelle/Couleur/Code sont enrichis APRÈS dans toDTO()
    public ActiviteDTO(Activité a) {
        this.id               = a.getId();
        this.nom              = a.getNom();
        this.description      = a.getDescription();
        this.numeroActivite   = a.getNumeroActivite();
        this.couleur          = a.getCouleur();
        this.statutActiviteId = a.getStatutActiviteId();
        this.statutLibelle    = null;       // enrichi dans toDTO()
        this.statutCouleur    = "#94a3b8";
        this.statutCode       = "";
        this.budget           = a.getBudget();
        this.quotaHoraire     = a.getQuotaHoraire();
        this.typeBudget       = a.getTypeBudget();
        this.visible          = a.isVisible();
        this.facturable       = a.isFacturable();
        this.estGlobale       = a.isEstGlobale();

        // ── PRIORITÉ : copier l'id, libellé/couleur/code enrichis dans toDTO() ──
        this.prioriteId      = a.getPrioriteId();
        this.prioriteLibelle = null;   // enrichi dans toDTO()
        this.prioriteCouleur = null;   // enrichi dans toDTO()
        this.prioriteCode    = null;   // enrichi dans toDTO()

        this.dateEcheance     = a.getDateEcheance();
        this.dateDebutReelle  = a.getDateDebutReelle();
        this.dateFinReelle    = a.getDateFinReelle();
        this.heuresEstimees   = a.getHeuresEstimees();
        this.heuresPassees    = a.getHeuresPassees();

        // Projets (Many-to-Many)
        try {
            if (a.getProjets() != null && !a.getProjets().isEmpty()) {
                this.projets = a.getProjets().stream()
                        .map(ProjetInfoDTO::new)
                        .toList();
            }
        } catch (Exception ignored) { this.projets = new ArrayList<>(); }

        // Groupes
        try {
            if (a.getGroupes() != null && !a.getGroupes().isEmpty()) {
                this.groupes = a.getGroupes().stream()
                        .map(GroupeInfoDTO::new)
                        .toList();
            }
        } catch (Exception ignored) { this.groupes = new ArrayList<>(); }

        // Utilisateur
        try {
            if (a.getUtilisateur() != null) {
                this.utilisateurId         = a.getUtilisateur().getId();
                this.utilisateurNomComplet = a.getUtilisateur().getNomComplet();
                // photoUrl et poste si disponibles sur l'entité Utilisateur
                try { this.utilisateurPhotoUrl = a.getUtilisateur().getPhotoUrl(); } catch (Exception ignored) {}
                try { this.utilisateurPoste    = a.getUtilisateur().getPoste();    } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}
// Multi-assignation
        try {
            if (a.getUtilisateurs() != null && !a.getUtilisateurs().isEmpty()) {
                this.utilisateurs = a.getUtilisateurs().stream()
                        .map(UtilisateurMinDTO::new)
                        .toList();
            }
        } catch (Exception ignored) { this.utilisateurs = new ArrayList<>(); }
        this.creePar       = a.getCreePar();
        this.dateCreation  = a.getDateCreation();
        this.dateMiseAJour = a.getDateMiseAJour();
    }
}