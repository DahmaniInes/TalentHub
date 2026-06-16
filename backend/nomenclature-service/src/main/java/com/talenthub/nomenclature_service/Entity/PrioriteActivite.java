package com.talenthub.nomenclature_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Entité de nomenclature — Priorité d'activité
 *
 * Remplace les priorités STATIQUES du frontend (1=Basse, 2=Normale, 3=Haute, 4=Urgente)
 * par une liste configurable en base de données.
 *
 * L'ordre d'affichage et les couleurs sont entièrement gérés ici.
 * Table SQL : priorite_activite
 */
@Entity
@Table(name = "priorite_activite")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrioriteActivite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Code unique en MAJUSCULES_UNDERSCORE.
     * Exemples : "BASSE", "NORMALE", "HAUTE", "URGENTE"
     * Utilisé comme référence stable dans le code métier.
     */
    @NotBlank
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    /**
     * Libellé lisible affiché dans l'interface.
     * Exemples : "Basse", "Normale", "Haute", "Urgente"
     */
    @NotBlank
    @Column(nullable = false, length = 100)
    private String libelle;

    /**
     * Description optionnelle expliquant le niveau de priorité.
     * Exemple : "Tâches non critiques pouvant être reportées"
     */
    @Column(length = 255)
    private String description;

    /**
     * Couleur hexadécimale pour l'affichage (badges, icônes).
     * Exemple : "#10b981" (vert), "#ef4444" (rouge)
     */
    @Column(length = 20)
    private String couleur;

    /**
     * Ordre de tri dans les listes déroulantes et le kanban.
     * 1 = priorité la plus basse affichée en premier.
     */
    @Column(nullable = false)
    private int ordre;

    /**
     * Une priorité inactive ne peut plus être assignée à une activité.
     * Les activités existantes conservent leur priorité même si désactivée.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;
}