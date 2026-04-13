package com.talenthub.application_service.DTO;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupeRequest {
    private String nom;
    private String description;
    private String couleur;
    private Long teamLeadId;
    private boolean actif;
    private List<Long> membresIds;  // IDs des utilisateurs à ajouter
}