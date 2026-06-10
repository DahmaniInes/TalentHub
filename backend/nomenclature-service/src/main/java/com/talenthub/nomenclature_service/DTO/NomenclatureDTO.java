package com.talenthub.nomenclature_service.DTO;

import com.talenthub.nomenclature_service.Entity.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
public class NomenclatureDTO {
    private Long    id;
    private String  code;
    private String  libelle;
    private String  description;
    private String  couleur;
    private Integer ordreAffichage;
    private boolean actif;

    public NomenclatureDTO(StatutProjet e) {
        this.id             = e.getId();
        this.code           = e.getCode();
        this.libelle        = e.getLibelle();
        this.description    = e.getDescription();
        this.couleur        = e.getCouleur();
        this.ordreAffichage = e.getOrdreAffichage();
        this.actif          = e.isActif();
    }

    public NomenclatureDTO(StatutStage e) {
        this.id             = e.getId();
        this.code           = e.getCode();
        this.libelle        = e.getLibelle();
        this.description    = e.getDescription();
        this.couleur        = e.getCouleur();
        this.ordreAffichage = e.getOrdreAffichage();
        this.actif          = e.isActif();
    }

    public NomenclatureDTO(TypeProjet e) {
        this.id          = e.getId();
        this.code        = e.getCode();
        this.libelle     = e.getLibelle();
        this.description = e.getDescription();
        this.actif       = e.isActif();
    }
}