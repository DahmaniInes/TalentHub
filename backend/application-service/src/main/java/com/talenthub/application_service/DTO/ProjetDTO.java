package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.MembreEquipe;
import com.talenthub.application_service.Entity.Projet;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

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

    // ✅ Statut via nomenclature (plus de String statut direct)
    private Long    statutProjetId;

    // ✅ Type de projet via nomenclature
    private Long    typeProjetId;

    private int     avancement;
    private Double  budgetPrevu;
    private Double  budgetConsomme;
    private Double  heuresEstimees;
    private Double  heuresPassees;
    private String  typeBudget;
    private Integer seuilAlerteHoraire;
    private boolean visible;
    private boolean facturable;
    private boolean autoriserActivitesGlobales;
    private String  responsableKeycloakId;
    private List<String>        projetAdmins    = new ArrayList<>();
    private int                 nombreMembres;
    private int                 nombreActivites;
    private List<GroupeInfoDTO> groupes         = new ArrayList<>();

    // ✅ Stagiaires membres (ceux avec un stage associé)
    private List<StagiaireMembreDTO> stagiaires = new ArrayList<>();

    private String dateCreation;

    // ── Inner DTOs ─────────────────────────────────────────────────────────

    @Data @NoArgsConstructor
    public static class GroupeInfoDTO {
        private Long   id;
        private String nom;
        private String couleur;
        private int    nombreMembres;
        private int    nombreProjetsActifs;

        public GroupeInfoDTO(Groupe g) {
            this.id     = g.getId();
            this.nom    = g.getNom();
            this.couleur = g.getCouleur();
            try { this.nombreMembres = g.getMembres() != null ? g.getMembres().size() : 0; }
            catch (Exception e) { this.nombreMembres = 0; }
            this.nombreProjetsActifs = 0;
        }
    }

    @Getter
    public static class StagiaireMembreDTO {
        private final Long   id;
        private final String nomComplet;
        private final String email;
        private final String photoUrl;
        private final Long   stageId;
        private final String role;

        public StagiaireMembreDTO(MembreEquipe m) {
            this.id         = m.getUtilisateur().getId();
            this.nomComplet = m.getUtilisateur().getNomComplet();
            this.email      = m.getUtilisateur().getEmail();
            this.photoUrl   = m.getUtilisateur().getPhotoUrl();
            this.stageId    = m.getStage() != null ? m.getStage().getId() : null;
            this.role       = m.getRole();
        }
    }

    // ── Constructeur depuis entité ────────────────────────────────────────

    public ProjetDTO(Projet p) {
        this.id            = p.getId();
        this.nom           = p.getNom();
        this.description   = p.getDescription();
        this.numeroProjet  = p.getNumeroProjet();
        this.couleur       = p.getCouleur();
        this.typeProjetId  = p.getTypeProjetId();
        this.statutProjetId = p.getStatutProjetId();
        this.avancement    = p.getAvancement();
        this.budgetPrevu   = p.getBudgetPrevu();
        this.budgetConsomme   = p.getBudgetConsomme();
        this.heuresEstimees   = p.getHeuresEstimees();
        try { this.heuresPassees = p.getHeuresPassees(); }
        catch (Exception e) { this.heuresPassees = 0.0; }
        this.typeBudget           = p.getTypeBudget();
        this.seuilAlerteHoraire   = p.getSeuilAlerteHoraire();
        this.visible              = p.isVisible();
        this.facturable           = p.isFacturable();
        this.autoriserActivitesGlobales = p.isAutoriserActivitesGlobales();
        this.responsableKeycloakId = p.getResponsableKeycloakId();

        this.dateDebut    = p.getDateDebut()    != null ? p.getDateDebut().toString()    : null;
        this.dateFin      = p.getDateFin()      != null ? p.getDateFin().toString()      : null;
        this.dateFinReelle = p.getDateFinReelle() != null ? p.getDateFinReelle().toString() : null;
        this.dateCreation  = p.getDateCreation()  != null ? p.getDateCreation().toString()  : null;

        try {
            if (p.getClient() != null) {
                this.clientId  = p.getClient().getId();
                this.clientNom = p.getClient().getNom();
            }
        } catch (Exception ignored) {}

        try { this.projetAdmins = p.getProjetAdmins() != null
                ? p.getProjetAdmins() : new ArrayList<>(); }
        catch (Exception ignored) { this.projetAdmins = new ArrayList<>(); }

        try { this.nombreMembres = p.getMembres() != null ? p.getMembres().size() : 0; }
        catch (Exception ignored) { this.nombreMembres = 0; }

        try { this.nombreActivites = p.getActivites() != null ? p.getActivites().size() : 0; }
        catch (Exception ignored) { this.nombreActivites = 0; }

        try {
            if (p.getGroupes() != null && !p.getGroupes().isEmpty()) {
                this.groupes = p.getGroupes().stream().map(GroupeInfoDTO::new).toList();
            }
        } catch (Exception ignored) { this.groupes = new ArrayList<>(); }

        // ✅ Stagiaires (membres avec stage non null)
        try {
            if (p.getMembres() != null) {
                this.stagiaires = p.getMembres().stream()
                        .filter(m -> m.getStage() != null)
                        .map(StagiaireMembreDTO::new)
                        .toList();
            }
        } catch (Exception ignored) { this.stagiaires = new ArrayList<>(); }
    }
}