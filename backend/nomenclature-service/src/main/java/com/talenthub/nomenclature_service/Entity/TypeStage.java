// nomenclature-service/.../Entity/TypeStage.java
package com.talenthub.nomenclature_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "type_stage")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TypeStage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true, length = 50)
    private String code;   // ex: "STAGE_ETE", "PFE"

    @NotBlank
    @Column(nullable = false, length = 100)
    private String libelle;  // ex: "Stage d'été", "Projet de Fin d'Études"

    @Column(length = 255)
    private String description;

    @Column(name = "duree_min_semaines")
    private Integer dureeMinSemaines;

    @Column(name = "duree_max_semaines")
    private Integer dureeMaxSemaines;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;
}