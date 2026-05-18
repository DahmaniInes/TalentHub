// Service/PermissionService.java — COMPLET (les guards sont dans les controllers)
package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Permission;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.PermissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class PermissionService {

    private final PermissionRepository repository;

    public PermissionService(PermissionRepository repository) {
        this.repository = repository;
    }

    public List<Permission> getAllPermissions() {
        return repository.findAll();
    }

    public Optional<Permission> getPermissionById(Long id) {
        return repository.findById(id);
    }

    public Permission createPermission(Permission permission) {
        return repository.save(permission);
    }

    public Permission updatePermission(Long id, Permission permissionDetails) {
        Permission permission = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Permission non trouvée: " + id));
        permission.setCode(permissionDetails.getCode());
        permission.setLibelle(permissionDetails.getLibelle());
        permission.setModule(permissionDetails.getModule());
        permission.setDescription(permissionDetails.getDescription());
        permission.setActif(permissionDetails.isActif());
        return repository.save(permission);
    }

    public void deletePermission(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Permission non trouvée avec id: " + id);
        }
        repository.deleteById(id);
    }
}