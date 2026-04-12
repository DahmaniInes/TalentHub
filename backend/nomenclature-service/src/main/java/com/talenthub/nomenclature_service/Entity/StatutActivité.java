package com.talenthub.nomenclature_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "statut_tache")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatutActivité {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true, length = 50)
    private String code; // ex: "TODO", "IN_PROGRESS", "DONE"

    @NotBlank
    @Column(nullable = false, length = 100)
    private String libelle;

    @Column(length = 20)
    private String couleur; // ex: "#10b981"

    @Column(nullable = false)
    private int ordre; // pour le tri dans l'affichage kanban

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;
}