package com.talenthub.nomenclature_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "statut_stage")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StatutStage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true, length = 50)
    private String code; // EN_COURS | TERMINE | ABANDONNE | SUSPENDU

    @NotBlank
    @Column(nullable = false, length = 150)
    private String libelle;

    @Column(length = 7)
    private String couleur;

    @Column(length = 255)
    private String description;

    @Column(name = "ordre_affichage")
    private Integer ordreAffichage;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;
}