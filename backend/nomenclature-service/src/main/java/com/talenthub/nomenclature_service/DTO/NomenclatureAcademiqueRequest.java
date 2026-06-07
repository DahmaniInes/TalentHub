package com.talenthub.nomenclature_service.DTO;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NomenclatureAcademiqueRequest {
    private String code;
    private String libelle;
    private String description;
    private Integer ordreAffichage; // pour NiveauEtude uniquement
    private boolean actif = true;
}