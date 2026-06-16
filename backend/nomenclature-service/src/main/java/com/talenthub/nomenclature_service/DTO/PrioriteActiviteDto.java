package com.talenthub.nomenclature_service.DTO;

import lombok.*;

/**
 * DTO de réponse — Priorité d'activité
 * Exposé par le controller, consommé par le frontend Angular.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrioriteActiviteDto {

    private Long id;

    /** Code unique : "BASSE", "NORMALE", "HAUTE", "URGENTE" */
    private String code;

    /** Libellé affiché : "Basse", "Normale", "Haute", "Urgente" */
    private String libelle;

    /** Description optionnelle */
    private String description;

    /** Couleur hexadécimale : "#10b981" */
    private String couleur;

    /** Ordre de tri */
    private int ordre;

    /** Actif / inactif */
    private boolean actif;
}