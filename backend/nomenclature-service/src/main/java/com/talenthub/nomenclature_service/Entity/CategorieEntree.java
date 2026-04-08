package com.talenthub.nomenclature_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "categorie_entree")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CategorieEntree {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // TRAVAIL | CONGE | MALADIE | FERIE | AUTRE
    @NotBlank
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String libelle;

    @Column(length = 255)
    private String description;

    @Column(length = 20)
    private String couleur;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;
}