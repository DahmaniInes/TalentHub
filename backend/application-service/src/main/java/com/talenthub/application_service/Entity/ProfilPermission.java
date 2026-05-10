package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "profil_permissions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"profil_id", "permission_id"})
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProfilPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profil_id", nullable = false)
    private Profil profil;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "permission_id", nullable = false)
    private Permission permission;

    // ✅ AUCUNE autre colonne — can_read/can_write/can_delete/can_export supprimées
}