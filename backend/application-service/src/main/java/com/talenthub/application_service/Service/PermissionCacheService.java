// application-service/.../Service/PermissionCacheService.java
package com.talenthub.application_service.Service;

import com.talenthub.application_service.Repository.ProfilPermissionRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PermissionCacheService {

    private final ProfilPermissionRepository repository;

    public PermissionCacheService(ProfilPermissionRepository repository) {
        this.repository = repository;
    }

    @Cacheable(value = "profil-permissions", key = "#profilId")
    public Set<String> getPermissionsForProfil(Long profilId) {
        return repository.findByProfilId(profilId)
                .stream()
                .map(pp -> pp.getPermission().getCode())
                .collect(Collectors.toSet());
    }

    @CacheEvict(value = "profil-permissions", key = "#profilId")
    public void evictProfil(Long profilId) {}

    @CacheEvict(value = "profil-permissions", allEntries = true)
    public void evictAll() {}
}