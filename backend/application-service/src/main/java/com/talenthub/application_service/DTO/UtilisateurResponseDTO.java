package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Utilisateur;
import lombok.Getter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
public class UtilisateurResponseDTO {
    private final Long id;
    private final String keycloakId;
    private final String nom;
    private final String prenom;
    private final String email;
    private final String telephone;
    private final LocalDate dateNaissance;
    private final LocalDate dateEmbauche;
    private final LocalDate dateFinContrat;
    private final String poste;
    private final String departement;
    private final String adresse;
    private final String photoUrl;
    private final boolean actif;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;
    private final String nomComplet;
    private final Long profilId;
    private final String profilNom;

    // Académique
    private final String universite;
    private final String specialite;
    private final String niveauEtude;

    // Stage
    private final LocalDate dateDebutStage;
    private final LocalDate dateFinStage;
    private final LocalDate dateSoutenance;
    private final Long typeStageId;

    // Superviseurs — IDs + noms (compatibilité)
    private final List<Long> superviseurIds;
    private final List<String> superviseurNoms;

    // Superviseurs — objets complets (pour style avatar dans tableau)
    private final List<SuperviseurMinDTO> superviseurs;

    public UtilisateurResponseDTO(Utilisateur u) {
        this.id             = u.getId();
        this.keycloakId     = u.getKeycloakId();
        this.nom            = u.getNom();
        this.prenom         = u.getPrenom();
        this.email          = u.getEmail();
        this.telephone      = u.getTelephone();
        this.dateNaissance  = u.getDateNaissance();
        this.dateEmbauche   = u.getDateEmbauche();
        this.dateFinContrat = u.getDateFinContrat();
        this.poste          = u.getPoste();
        this.departement    = u.getDepartement();
        this.adresse        = u.getAdresse();
        this.photoUrl       = u.getPhotoUrl();
        this.actif          = u.isActif();
        this.createdAt      = u.getCreatedAt();
        this.updatedAt      = u.getUpdatedAt();
        this.nomComplet     = u.getNomComplet();
        this.profilId       = u.getProfil() != null ? u.getProfil().getId()  : null;
        this.profilNom      = u.getProfil() != null ? u.getProfil().getNom() : null;

        this.universite     = u.getUniversite();
        this.specialite     = u.getSpecialite();
        this.niveauEtude    = u.getNiveauEtude();
        this.dateDebutStage = u.getDateDebutStage();
        this.dateFinStage   = u.getDateFinStage();
        this.dateSoutenance = u.getDateSoutenance();
        this.typeStageId    = u.getTypeStageId();

        this.superviseurIds  = u.getSuperviseurs() != null
                ? u.getSuperviseurs().stream().map(Utilisateur::getId).toList()
                : List.of();
        this.superviseurNoms = u.getSuperviseurs() != null
                ? u.getSuperviseurs().stream().map(Utilisateur::getNomComplet).toList()
                : List.of();
        this.superviseurs    = u.getSuperviseurs() != null
                ? u.getSuperviseurs().stream()
                .map(s -> new SuperviseurMinDTO(
                        s.getId(),
                        s.getNomComplet(),
                        s.getEmail(),
                        s.getPhotoUrl(),
                        s.getPoste()
                ))
                .toList()
                : List.of();
    }

    @Getter
    public static class SuperviseurMinDTO {
        private final Long   id;
        private final String nomComplet;
        private final String email;
        private final String photoUrl;
        private final String poste;

        public SuperviseurMinDTO(Long id, String nomComplet, String email,
                                 String photoUrl, String poste) {
            this.id         = id;
            this.nomComplet = nomComplet;
            this.email      = email;
            this.photoUrl   = photoUrl;
            this.poste      = poste;
        }
    }
}