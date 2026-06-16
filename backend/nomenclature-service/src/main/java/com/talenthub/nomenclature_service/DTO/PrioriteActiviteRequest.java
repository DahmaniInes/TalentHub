package com.talenthub.nomenclature_service.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * DTO de requête — Créer ou modifier une priorité d'activité.
 * Utilisé pour POST et PUT.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrioriteActiviteRequest {

    /**
     * Code en MAJUSCULES. Ne peut pas être modifié après création.
     * Pattern : lettres majuscules, chiffres, underscore.
     */
    @NotBlank(message = "Le code est obligatoire")
    @Pattern(regexp = "^[A-Z0-9_]+$", message = "Le code doit être en majuscules (lettres, chiffres, underscore)")
    @Size(max = 50)
    private String code;

    @NotBlank(message = "Le libellé est obligatoire")
    @Size(max = 100)
    private String libelle;

    @Size(max = 255)
    private String description;

    /** Couleur hex : "#10b981" */
    private String couleur;

    private int ordre;

    @Builder.Default
    private boolean actif = true;
}