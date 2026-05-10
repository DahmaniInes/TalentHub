// DTO/ProfilPermissionDTO.java — REMPLACE le fichier entier
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.ProfilPermission;

public class ProfilPermissionDTO {
    public Long   id;
    public Long   profilId;
    public Long   permissionId;
    public String permissionCode;
    public String permissionModule;
    public String permissionLibelle;

    public ProfilPermissionDTO(ProfilPermission pp) {
        this.id               = pp.getId();
        this.profilId         = pp.getProfil()     != null ? pp.getProfil().getId()          : null;
        this.permissionId     = pp.getPermission() != null ? pp.getPermission().getId()       : null;
        this.permissionCode   = pp.getPermission() != null ? pp.getPermission().getCode()     : null;
        this.permissionModule = pp.getPermission() != null ? pp.getPermission().getModule()   : null;
        this.permissionLibelle= pp.getPermission() != null ? pp.getPermission().getLibelle()  : null;
    }
}