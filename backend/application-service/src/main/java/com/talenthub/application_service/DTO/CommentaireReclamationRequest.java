package com.talenthub.application_service.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public class CommentaireReclamationRequest {
        @NotBlank
        private String contenu;
        @NotBlank private String auteurKeycloakId;
        private String auteurNom;
        private boolean estAdmin;
    }

