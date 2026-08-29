// DTO/JourFerieDTO.java
package com.talenthub.application_service.DTO;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Getter @Setter @NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true) // ✅ ignore les champs supplémentaires renvoyés par Nager.Date
public class JourFerieDTO implements Serializable {
    private String date;
    private String localName;
    private String name;
}