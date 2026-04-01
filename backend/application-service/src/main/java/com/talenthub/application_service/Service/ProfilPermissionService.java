package com.talenthub.application_service.Service;


import com.talenthub.application_service.Entity.ProfilPermission;
import com.talenthub.application_service.Repository.ProfilPermissionRepository;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
// 9. ProfilPermissionService.java
@Service
@Transactional
public class ProfilPermissionService {

    private final ProfilPermissionRepository repository;

    public ProfilPermissionService(ProfilPermissionRepository repository) {
        this.repository = repository;
    }

    public List<ProfilPermission> getAllProfilPermissions() {
        return repository.findAll();
    }

    public Optional<ProfilPermission> getProfilPermissionById(Long id) {
        return repository.findById(id);
    }

    public List<ProfilPermission> getPermissionsByProfil(Long profilId) {
        return repository.findByProfilId(profilId);
    }

    public ProfilPermission createProfilPermission(ProfilPermission profilPermission) {
        return repository.save(profilPermission);
    }

    public ProfilPermission updateProfilPermission(Long id, ProfilPermission details) {
        ProfilPermission pp = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ProfilPermission non trouvé avec id: " + id));

        pp.setCanRead(details.isCanRead());
        pp.setCanWrite(details.isCanWrite());
        pp.setCanDelete(details.isCanDelete());
        pp.setCanExport(details.isCanExport());

        return repository.save(pp);
    }

    public void deleteProfilPermission(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("ProfilPermission non trouvé avec id: " + id);
        }
        repository.deleteById(id);
    }


}
