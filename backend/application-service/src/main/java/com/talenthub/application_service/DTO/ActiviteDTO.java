// ActiviteDTO.java — REMPLACE COMPLET
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.Projet;
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

    // ✅ NOUVEAU
    private boolean estGlobale;

    private int    priorite;
    private String prioriteLibelle;

    private LocalDate     dateEcheance;
    private LocalDate     dateDebutReelle;
    private LocalDate     dateFinReelle;
    private Double        heuresEstimees;
    private Double        heuresPassees;

    // ✅ REMPLACÉ : plus de projetId/projetNom — une activité peut être dans N projets
    private List<ProjetInfoDTO> projets = new ArrayList<>();

    private Long   utilisateurId;
    private String utilisateurNomComplet;

    private List<GroupeInfoDTO> groupes = new ArrayList<>();

    private String        creePar;
    private LocalDateTime dateCreation;
    private LocalDateTime dateMiseAJour;

    // ── DTOs imbriqués ──

    @Data @NoArgsConstructor
    public static class ProjetInfoDTO {
        private Long   id;
        private String nom;
        private String couleur;
        private String numeroProjet;

        public ProjetInfoDTO(Projet p) {
            this.id          = p.getId();
            this.nom         = p.getNom();
            this.couleur     = p.getCouleur();
            this.numeroProjet = p.getNumeroProjet();
        }
    }

    @Data @NoArgsConstructor
    public static class GroupeInfoDTO {
        private Long   id;
        private String nom;
        private String couleur;

        public GroupeInfoDTO(Groupe g) {
            this.id     = g.getId();
            this.nom    = g.getNom();
            this.couleur = g.getCouleur();
        }
    }

    // ── Constructeur depuis entité ──
    public ActiviteDTO(Activité a) {
        this.id               = a.getId();
        this.nom              = a.getNom();
        this.description      = a.getDescription();
        this.numeroActivite   = a.getNumeroActivite();
        this.couleur          = a.getCouleur();
        this.statutActiviteId = a.getStatutActiviteId();
        this.statutLibelle    = null; // enrichi dans toDTO()
        this.statutCouleur    = "#94a3b8";
        this.statutCode       = "";
        this.budget           = a.getBudget();
        this.quotaHoraire     = a.getQuotaHoraire();
        this.typeBudget       = a.getTypeBudget();
        this.visible          = a.isVisible();
        this.facturable       = a.isFacturable();
        this.estGlobale       = a.isEstGlobale(); // ✅
        this.priorite         = a.getPriorite();
        this.prioriteLibelle  = resolvePriorite(a.getPriorite());
        this.dateEcheance     = a.getDateEcheance();
        this.dateDebutReelle  = a.getDateDebutReelle();
        this.dateFinReelle    = a.getDateFinReelle();
        this.heuresEstimees   = a.getHeuresEstimees();
        this.heuresPassees    = a.getHeuresPassees();

        // ✅ Projets (Many-to-Many)
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

        try { if (a.getUtilisateur() != null) {
            this.utilisateurId         = a.getUtilisateur().getId();
            this.utilisateurNomComplet = a.getUtilisateur().getNomComplet();
        }} catch (Exception ignored) {}

        this.creePar       = a.getCreePar();
        this.dateCreation  = a.getDateCreation();
        this.dateMiseAJour = a.getDateMiseAJour();
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