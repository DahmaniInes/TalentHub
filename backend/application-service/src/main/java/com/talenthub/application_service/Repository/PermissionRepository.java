package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, Long> { }