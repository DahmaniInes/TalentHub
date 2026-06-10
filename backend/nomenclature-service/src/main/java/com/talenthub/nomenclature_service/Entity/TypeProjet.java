package com.talenthub.nomenclature_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "type_projet")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TypeProjet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true, length = 50)
    private String code; // ENTREPRISE_INTERNE | ENTREPRISE_CLIENT | STAGE_ACADEMIQUE

    @NotBlank
    @Column(nullable = false, length = 150)
    private String libelle;

    @Column(length = 255)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;
}