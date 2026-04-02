package com.talenthub.nomenclature_service.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StatutDemandeRequest {
    @NotBlank private String code;
    @NotBlank private String libelle;
    private String couleur;
    private boolean actif = true;
}