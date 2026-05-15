// nomenclature-service/.../DTO/StatutReclamationDTO.java
package com.talenthub.nomenclature_service.DTO;

import com.talenthub.nomenclature_service.Entity.StatutReclamation;
import lombok.*;

@Data
@NoArgsConstructor
public class StatutReclamationDTO {

    private Long    id;
    private String  code;
    private String  libelle;
    private String  description;
    private boolean actif;

    public StatutReclamationDTO(StatutReclamation s) {
        this.id          = s.getId();
        this.code        = s.getCode();
        this.libelle     = s.getLibelle();
        this.description = s.getDescription();
        this.actif       = s.isActif();
    }
}