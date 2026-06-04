// DTO/UserCreationRequest.java — REMPLACE le fichier entier
package com.talenthub.application_service.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class UserCreationRequest {

    @NotBlank
    private String nom;
    @NotBlank
    private String prenom;
    @Email
    @NotBlank
    private String email;
    private String telephone;
    private LocalDate dateNaissance;
    private LocalDate dateEmbauche;
    private LocalDate dateFinContrat;
    private String poste;
    private String departement;
    private String adresse;

    @NotNull
    private Long profilId;


    private String universite;
    private String specialite;
    private String niveauEtude;
    private LocalDate dateDebutStage;
    private LocalDate dateFinStage;
    private LocalDate dateSoutenance;
    private Long typeStageId;

}