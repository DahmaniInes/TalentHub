// nomenclature-service/.../DTO/ServiceReclamationDTO.java
package com.talenthub.nomenclature_service.DTO;

import com.talenthub.nomenclature_service.Entity.ServiceReclamation;
import lombok.*;

@Data
@NoArgsConstructor
public class ServiceReclamationDTO {

    private Long    id;
    private String  code;
    private String  libelle;
    private String  description;
    private boolean actif;

    public ServiceReclamationDTO(ServiceReclamation s) {
        this.id          = s.getId();
        this.code        = s.getCode();
        this.libelle     = s.getLibelle();
        this.description = s.getDescription();
        this.actif       = s.isActif();
    }
}