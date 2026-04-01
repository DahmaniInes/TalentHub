package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Permission;
import lombok.Getter;

@Getter
public class PermissionDTO {
    private final Long id;
    private final String code;
    private final String libelle;
    private final String module;
    private final String description;
    private final boolean actif;

    public PermissionDTO(Permission p) {
        this.id = p.getId();
        this.code = p.getCode();
        this.libelle = p.getLibelle();
        this.module = p.getModule();
        this.description = p.getDescription();
        this.actif = p.isActif();
    }
}