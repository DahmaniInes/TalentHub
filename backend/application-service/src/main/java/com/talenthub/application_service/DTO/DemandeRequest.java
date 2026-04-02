package com.talenthub.application_service.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DemandeRequest {
    @NotNull  private Long utilisateurId;
    @NotNull  private Long typeDemandeId;
    private Long statutDemandeId;  // optionnel, défaut = 1er statut
    @NotBlank private String sujet;
    private String description;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private Integer nbJours;
    private String commentaireRH;
    private String pieceJointeUrl;
}