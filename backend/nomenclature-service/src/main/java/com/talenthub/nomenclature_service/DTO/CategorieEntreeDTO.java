package com.talenthub.nomenclature_service.DTO;

import com.talenthub.nomenclature_service.Entity.CategorieEntree;
import lombok.Getter;

@Getter
public class CategorieEntreeDTO {
    private final Long id;
    private final String code;
    private final String libelle;
    private final String description;
    private final String couleur;
    private final boolean actif;

    public CategorieEntreeDTO(CategorieEntree c) {
        this.id = c.getId();
        this.code = c.getCode();
        this.libelle = c.getLibelle();
        this.description = c.getDescription();
        this.couleur = c.getCouleur();
        this.actif = c.isActif();
    }
}