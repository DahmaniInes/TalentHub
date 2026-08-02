package com.talenthub.nomenclature_service.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TypeDemandeRequest {
    @NotBlank private String code;
    @NotBlank private String libelle;
    private String description;
    private boolean actif = true;
    private boolean estConge;
}