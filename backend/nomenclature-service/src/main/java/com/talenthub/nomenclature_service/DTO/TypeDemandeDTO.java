package com.talenthub.nomenclature_service.DTO;

import com.talenthub.nomenclature_service.Entity.TypeDemande;
import lombok.Getter;

@Getter
public class TypeDemandeDTO {
    private final Long id;
    private final String code;
    private final String libelle;
    private final String description;
    private final boolean actif;

    public TypeDemandeDTO(TypeDemande t) {
        this.id = t.getId();
        this.code = t.getCode();
        this.libelle = t.getLibelle();
        this.description = t.getDescription();
        this.actif = t.isActif();
    }
}