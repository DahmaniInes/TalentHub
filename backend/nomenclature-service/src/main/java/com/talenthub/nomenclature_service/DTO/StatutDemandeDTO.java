package com.talenthub.nomenclature_service.DTO;

import com.talenthub.nomenclature_service.Entity.StatutDemande;
import lombok.Getter;

@Getter
public class StatutDemandeDTO {
    private final Long id;
    private final String code;
    private final String libelle;
    private final String couleur;
    private final boolean actif;

    public StatutDemandeDTO(StatutDemande s) {
        this.id = s.getId();
        this.code = s.getCode();
        this.libelle = s.getLibelle();
        this.couleur = s.getCouleur();
        this.actif = s.isActif();
    }
}