package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "utilisateurs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "keycloak_id", nullable = false, unique = true)
    private String keycloakId;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String nom;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String prenom;

    @Email @NotBlank
    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 20)
    private String telephone;

    @Column(name = "date_naissance")
    private LocalDate dateNaissance;

    @Column(name = "date_embauche", nullable = false)
    private LocalDate dateEmbauche;

    @Column(name = "date_fin_contrat")
    private LocalDate dateFinContrat;

    @Column(length = 100)
    private String poste;

    @Column(length = 100)
    private String departement;

    @Column(length = 255)
    private String adresse;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Profil ──
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profil_id")
    private Profil profil;

    // ── Relations métier ──
    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<FeuilleTemps> feuillesTemps = new ArrayList<>();

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Demande> demandes = new ArrayList<>();

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Reclamation> reclamations = new ArrayList<>();

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Document> documents = new ArrayList<>();

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Activité> taches = new ArrayList<>();

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Evaluation> evaluations = new ArrayList<>();

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Rapport> rapports = new ArrayList<>();

    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<MembreEquipe> membresEquipe = new ArrayList<>();

    // ══ CHAMPS ACADÉMIQUES — appartiennent à la personne, pas au stage ══
    // Ces champs sont archivés via HistoriqueUtilisateur
    // universite, specialite, niveauEtude sont maintenant des IDs vers nomenclature
    @Column(name = "universite_id")
    private Long universiteId;       // → Universite dans nomenclature-service

    @Column(name = "specialite_id")
    private Long specialiteId;       // → Specialite dans nomenclature-service

    @Column(name = "niveau_etude_id")
    private Long niveauEtudeId;      // → NiveauEtude dans nomenclature-service

    // ══ STAGES — un utilisateur peut faire plusieurs stages ══
    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL,
            fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<Stage> stages = new ArrayList<>();

    // ══ SUPERVISEURS — table intermédiaire dédiée StagiaireSuperviseur ══
    // La relation ManyToMany brute est remplacée par une entité intermédiaire
    // pour pouvoir ajouter des métadonnées (dateDebut, dateFin, etc.)
    @OneToMany(mappedBy = "stagiaire", cascade = CascadeType.ALL,
            fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<StagiaireSuperviseur> superviseurLinks = new ArrayList<>();

    // Relation inverse — stagiaires encadrés par ce superviseur
    @OneToMany(mappedBy = "superviseur", fetch = FetchType.LAZY)
    @Builder.Default
    private List<StagiaireSuperviseur> stagiairesEncadresLinks = new ArrayList<>();

    // ══ HISTORIQUE ══
    @OneToMany(mappedBy = "utilisateur", cascade = CascadeType.ALL,
            fetch = FetchType.LAZY, orphanRemoval = true)
    @Builder.Default
    private List<HistoriqueUtilisateur> historique = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public String getNomComplet() { return prenom + " " + nom; }

    // ✅ CORRIGÉ — Helpers pour compatibilité : ne renvoient que les liens
    // ACTIFS (actif=true). AVANT, ces deux méthodes retournaient TOUS les
    // liens de superviseurLinks/stagiairesEncadresLinks sans filtrer le
    // flag actif — donc même après avoir correctement désactivé un lien en
    // base (StagiaireService.retirerSuperviseur()/assignerSuperviseurs()),
    // un superviseur retiré continuait d'apparaître dans la réponse API
    // (UtilisateurResponseDTO), donnant l'impression que la suppression
    // n'avait aucun effet alors que la base était pourtant correcte.
    public List<Utilisateur> getSuperviseurs() {
        return superviseurLinks.stream()
                .filter(StagiaireSuperviseur::isActif)
                .map(StagiaireSuperviseur::getSuperviseur)
                .toList();
    }

    public List<Utilisateur> getStagiairesEncadres() {
        return stagiairesEncadresLinks.stream()
                .filter(StagiaireSuperviseur::isActif)
                .map(StagiaireSuperviseur::getStagiaire)
                .toList();
    }
}