package com.talenthub.nomenclature_service.DTO;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter; import lombok.Setter;

@Getter @Setter
public class ParametreCongeRequest {
    @NotNull @Positive
    private Double tauxMensuel;
}