// UtilisateurResponseDTO.java — COMPLET robuste
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Entity.Stage;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Data
public class UtilisateurResponseDTO {

    private Long    id;
    private String  keycloakId;
    private String  nom;
    private String  prenom;
    private String  email;
    private String  telephone;
    private LocalDate dateNaissance;
    private LocalDate dateEmbauche;
    private LocalDate dateFinContrat;
    private String  poste;
    private String  departement;
    private String  adresse;
    private String  photoUrl;
    private boolean actif;
    private String  nomComplet;
    private Long    profilId;
    private String  profilNom;
    private String  createdAt;
    private String  updatedAt;

    // ✅ Académique — IDs nomenclature
    private Long    universiteId;
    private Long    specialiteId;
    private Long    niveauEtudeId;

    // ✅ Stages
    private List<StageMinDTO> stages;

    // ✅ Superviseurs
    private List<Long>   superviseurIds;
    private List<String> superviseurNoms;
    private List<SuperviseurMinDTO> superviseurs;

    // ✅ Projets de stage via membresEquipe
    private List<StagiaireMembreMinDTO> projetsStage;

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
        this.nomComplet     = (u.getPrenom() != null ? u.getPrenom() : "")
                + " "
                + (u.getNom() != null ? u.getNom() : "");

        // Profil
        if (u.getProfil() != null) {
            this.profilId  = u.getProfil().getId();
            this.profilNom = u.getProfil().getNom();
        }

        // ✅ Académique
        this.universiteId  = u.getUniversiteId();
        this.specialiteId  = u.getSpecialiteId();
        this.niveauEtudeId = u.getNiveauEtudeId();

        // ✅ Stages — avec protection null
        if (u.getStages() != null) {
            this.stages = u.getStages().stream()
                    .map(s -> new StageMinDTO(
                            s.getId(),
                            s.getUtilisateur() != null ? s.getUtilisateur().getId() : null,
                            s.getTypeStageId(),
                            s.getStatutStageId(),
                            s.getDateDebut(),
                            s.getDateFin(),
                            s.getDateSoutenance(),
                            s.getDescription(),
                            s.getCreatedAt() != null ? s.getCreatedAt().toString() : null,
                            null // projetIds
                    ))
                    .collect(Collectors.toList());
        } else {
            this.stages = List.of();
        }

        // ✅ Superviseurs — avec protection null
        if (u.getSuperviseurs() != null && !u.getSuperviseurs().isEmpty()) {
            this.superviseurIds  = u.getSuperviseurs().stream()
                    .map(Utilisateur::getId)
                    .collect(Collectors.toList());
            this.superviseurNoms = u.getSuperviseurs().stream()
                    .map(s -> (s.getPrenom() != null ? s.getPrenom() : "")
                            + " " + (s.getNom() != null ? s.getNom() : ""))
                    .collect(Collectors.toList());
            this.superviseurs = u.getSuperviseurs().stream()
                    .map(s -> new SuperviseurMinDTO(
                            s.getId(),
                            (s.getPrenom() != null ? s.getPrenom() : "")
                                    + " " + (s.getNom() != null ? s.getNom() : ""),
                            s.getEmail(),
                            s.getPhotoUrl(),
                            s.getPoste()
                    ))
                    .collect(Collectors.toList());
        } else {
            this.superviseurIds  = List.of();
            this.superviseurNoms = List.of();
            this.superviseurs    = List.of();
        }

        // ✅ Projets de stage — avec protection null
        this.projetsStage = List.of();
    }

    // ── Inner DTOs ────────────────────────────────────────────────

    @Data
    public static class StageMinDTO {
        private Long    id;
        private Long    utilisateurId;
        private Long    typeStageId;
        private Long    statutStageId;
        private LocalDate dateDebut;
        private LocalDate dateFin;
        private LocalDate dateSoutenance;
        private String  description;
        private String  createdAt;
        private List<Long> projetIds;

        public StageMinDTO(Long id, Long utilisateurId, Long typeStageId,
                           Long statutStageId, LocalDate dateDebut,
                           LocalDate dateFin, LocalDate dateSoutenance,
                           String description, String createdAt,
                           List<Long> projetIds) {
            this.id             = id;
            this.utilisateurId  = utilisateurId;
            this.typeStageId    = typeStageId;
            this.statutStageId  = statutStageId;
            this.dateDebut      = dateDebut;
            this.dateFin        = dateFin;
            this.dateSoutenance = dateSoutenance;
            this.description    = description;
            this.createdAt      = createdAt;
            this.projetIds      = projetIds != null ? projetIds : List.of();
        }
    }

    @Data
    public static class SuperviseurMinDTO {
        private Long   id;
        private String nomComplet;
        private String email;
        private String photoUrl;
        private String poste;

        public SuperviseurMinDTO(Long id, String nomComplet, String email,
                                 String photoUrl, String poste) {
            this.id         = id;
            this.nomComplet = nomComplet != null ? nomComplet.trim() : "";
            this.email      = email;
            this.photoUrl   = photoUrl;
            this.poste      = poste;
        }
    }

    @Data
    public static class StagiaireMembreMinDTO {
        private Long   id;
        private String nomComplet;
        private String email;
        private String photoUrl;
        private Long   stageId;
        private String role;

        public StagiaireMembreMinDTO(Long id, String nomComplet, String email,
                                     String photoUrl, Long stageId, String role) {
            this.id         = id;
            this.nomComplet = nomComplet;
            this.email      = email;
            this.photoUrl   = photoUrl;
            this.stageId    = stageId;
            this.role       = role;
        }
    }
}