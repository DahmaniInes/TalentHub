// nomenclature-service/.../DTO/ServiceReclamationRequest.java
package com.talenthub.nomenclature_service.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceReclamationRequest {

    @NotBlank(message = "Le code est obligatoire")
    private String code;

    @NotBlank(message = "Le libellé est obligatoire")
    private String libelle;

    private String description;

    private boolean actif = true;
}