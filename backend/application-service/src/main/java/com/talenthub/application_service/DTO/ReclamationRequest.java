// application-service/.../DTO/ReclamationRequest.java
package com.talenthub.application_service.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ReclamationRequest {
    @NotNull  private Long    utilisateurId;
    @NotNull  private Long    serviceReclamationId;
    private           Long    statutReclamationId;   // null → défaut EN_ATTENTE (id=1)
    @NotBlank private String  sujet;
    private           String  description;
    private           String  pieceJointeUrl;        // URL retournée par POST /reclamations/upload
}
