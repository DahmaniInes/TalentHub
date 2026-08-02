package com.talenthub.nomenclature_service.DTO;

import com.talenthub.nomenclature_service.Entity.ParametreConge;
import lombok.Getter;

@Getter
public class ParametreCongeDTO {
    private final Long id;
    private final Double tauxMensuel;

    public ParametreCongeDTO(ParametreConge p) {
        this.id = p.getId();
        this.tauxMensuel = p.getTauxMensuel();
    }
}