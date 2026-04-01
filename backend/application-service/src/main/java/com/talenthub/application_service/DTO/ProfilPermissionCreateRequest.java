package com.talenthub.application_service.DTO;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ProfilPermissionCreateRequest {
    private Long profilId;
    private List<PermissionAssignment> permissions;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class PermissionAssignment {
        private Long permissionId;
        private boolean canRead;
        private boolean canWrite;
        private boolean canDelete;
        private boolean canExport;
    }
}