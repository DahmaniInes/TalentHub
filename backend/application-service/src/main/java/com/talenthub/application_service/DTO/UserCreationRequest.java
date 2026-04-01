package com.talenthub.application_service.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
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

    // ✅ Permissions sélectionnées par l'admin
    private List<PermissionSelectionDTO> permissions;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PermissionSelectionDTO {
        private Long permissionId;
        private boolean canRead;
        private boolean canWrite;
        private boolean canDelete;
        private boolean canExport;
    }
}