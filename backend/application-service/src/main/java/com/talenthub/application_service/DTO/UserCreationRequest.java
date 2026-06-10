package com.talenthub.application_service.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class UserCreationRequest {

    @NotBlank private String nom;
    @NotBlank private String prenom;
    @Email @NotBlank private String email;
    private String    telephone;
    private LocalDate dateNaissance;
    private LocalDate dateEmbauche;
    private LocalDate dateFinContrat;
    private String    poste;
    private String    departement;
    private String    adresse;

    @NotNull private Long profilId;

    // ✅ IDs vers nomenclature (remplacent les String)
    private Long universiteId;
    private Long specialiteId;
    private Long niveauEtudeId;

    // Infos stage (pour créer le premier Stage)
    private Long      typeStageId;
    private LocalDate dateDebutStage;
    private LocalDate dateFinStage;
    private LocalDate dateSoutenance;
}