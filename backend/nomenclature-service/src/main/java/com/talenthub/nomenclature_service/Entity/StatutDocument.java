package com.talenthub.nomenclature_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "statut_document")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StatutDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true, length = 50)
    private String code;  // ACTIF | ARCHIVE | SUPPRIME

    @NotBlank
    @Column(nullable = false, length = 100)
    private String libelle;

    @Column(length = 7)
    private String couleur;  // ex: "#10b981"

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;
}