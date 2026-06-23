// DTO/EvaluationResumeDTO.java — NOUVEAU
package com.talenthub.application_service.DTO;

import lombok.Getter;

@Getter
public class EvaluationResumeDTO {

    private final Long   activiteId;
    private final Double moyenne;
    private final long   total;

    public EvaluationResumeDTO(Long activiteId, Double moyenne, long total) {
        this.activiteId = activiteId;
        this.moyenne    = moyenne != null ? Math.round(moyenne * 10) / 10.0 : 0.0;
        this.total      = total;
    }
}