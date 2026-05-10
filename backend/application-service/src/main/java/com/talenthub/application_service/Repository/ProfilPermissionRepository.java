// Repository/ProfilPermissionRepository.java — AJOUTE cette méthode
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.ProfilPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProfilPermissionRepository extends JpaRepository<ProfilPermission, Long> {


    List<ProfilPermission> findByProfilId(Long profilId);

    Optional<ProfilPermission> findByProfilIdAndPermissionId(
            Long profilId, Long permissionId);

    // ✅ Retourne directement les codes — évite le LazyInit
    @Query("SELECT pp.permission.code FROM ProfilPermission pp " +
            "WHERE pp.profil.id = :profilId " +
            "AND pp.permission.code IS NOT NULL")
    List<String> findPermissionCodesByProfilId(@Param("profilId") Long profilId);
}