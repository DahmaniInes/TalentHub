package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.ProfilPermission;
import lombok.Getter;

@Getter
public class ProfilPermissionDTO {
    private final Long id;
    private final Long profilId;
    private final Long permissionId;
    private final String permissionCode;
    private final String permissionLibelle;
    private final String permissionModule;
    private final boolean canRead;
    private final boolean canWrite;
    private final boolean canDelete;
    private final boolean canExport;

    public ProfilPermissionDTO(ProfilPermission pp) {
        this.id = pp.getId();
        this.profilId = pp.getProfil() != null ? pp.getProfil().getId() : null;
        this.permissionId = pp.getPermission() != null ? pp.getPermission().getId() : null;
        this.permissionCode = pp.getPermission() != null ? pp.getPermission().getCode() : null;
        this.permissionLibelle = pp.getPermission() != null ? pp.getPermission().getLibelle() : null;
        this.permissionModule = pp.getPermission() != null ? pp.getPermission().getModule() : null;
        this.canRead = pp.isCanRead();
        this.canWrite = pp.isCanWrite();
        this.canDelete = pp.isCanDelete();
        this.canExport = pp.isCanExport();
    }
}