package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.ProfilPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProfilPermissionRepository extends JpaRepository<ProfilPermission, Long> {
    List<ProfilPermission> findByProfilId(Long profilId);
    Optional<ProfilPermission> findByProfilIdAndPermissionId(Long profilId, Long permissionId);

}