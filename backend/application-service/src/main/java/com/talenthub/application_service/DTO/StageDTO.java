package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Stage;
import lombok.Getter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
public class StageDTO {
    private final Long      id;
    private final Long      utilisateurId;
    private final Long      typeStageId;
    private final Long      statutStageId;
    private final LocalDate dateDebut;
    private final LocalDate dateFin;
    private final LocalDate dateSoutenance;
    private final String    description;
    private final LocalDateTime createdAt;
    private final List<Long> projetIds;

    public StageDTO(Stage s) {
        this.id            = s.getId();
        this.utilisateurId = s.getUtilisateur().getId();
        this.typeStageId   = s.getTypeStageId();
        this.statutStageId = s.getStatutStageId();
        this.dateDebut     = s.getDateDebut();
        this.dateFin       = s.getDateFin();
        this.dateSoutenance = s.getDateSoutenance();
        this.description   = s.getDescription();
        this.createdAt     = s.getCreatedAt();
        this.projetIds = s.getAffectationsProjets() != null
                ? s.getAffectationsProjets().stream()
                .map(m -> m.getProjet().getId())
                .toList()
                : List.of();
    }
}