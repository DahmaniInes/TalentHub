// application-service/.../Service/ProfilPermissionService.java — REMPLACE
package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.ProfilPermission;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.ProfilPermissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ProfilPermissionService {

    private final ProfilPermissionRepository repository;
    private final GatewayEvictService        gatewayEvict;

    public ProfilPermissionService(ProfilPermissionRepository repository,
                                   GatewayEvictService gatewayEvict) {
        this.repository   = repository;
        this.gatewayEvict = gatewayEvict;
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

    public ProfilPermission createProfilPermission(ProfilPermission pp) {
        ProfilPermission saved = repository.save(pp);
        Long profilId = pp.getProfil().getId();

        // ✅ Éviction Redis APRÈS le commit — jamais pendant la transaction
        evictAfterCommit(profilId);

        return saved;
    }

    public void deleteProfilPermission(Long id) {
        ProfilPermission pp = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Non trouvé: " + id));
        Long profilId = pp.getProfil().getId();
        repository.deleteById(id);

        // ✅ Éviction Redis APRÈS le commit
        evictAfterCommit(profilId);
    }

    // ✅ Enregistre l'éviction pour qu'elle s'exécute après le commit BD
    private void evictAfterCommit(Long profilId) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            gatewayEvict.evict(profilId);
                        }
                    }
            );
        } else {
            // Pas de transaction active → éviction directe
            gatewayEvict.evict(profilId);
        }
    }
}