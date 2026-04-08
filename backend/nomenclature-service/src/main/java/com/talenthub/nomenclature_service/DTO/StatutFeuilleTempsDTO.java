package com.talenthub.nomenclature_service.DTO;

import com.talenthub.nomenclature_service.Entity.StatutFeuilleTemps;
import lombok.Getter;

@Getter
public class StatutFeuilleTempsDTO {
    private final Long id;
    private final String code;
    private final String libelle;
    private final String description;
    private final String couleur;
    private final boolean actif;

    public StatutFeuilleTempsDTO(StatutFeuilleTemps s) {
        this.id = s.getId();
        this.code = s.getCode();
        this.libelle = s.getLibelle();
        this.description = s.getDescription();
        this.couleur = s.getCouleur();
        this.actif = s.isActif();
    }
}