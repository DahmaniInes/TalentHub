// nomenclature-service/.../Service/ServiceReclamationService.java
package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.DTO.ServiceReclamationRequest;
import com.talenthub.nomenclature_service.Entity.ServiceReclamation;
import com.talenthub.nomenclature_service.Repository.ServiceReclamationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ServiceReclamationService {

    private final ServiceReclamationRepository repository;

    public ServiceReclamationService(ServiceReclamationRepository repository) {
        this.repository = repository;
    }

    public List<ServiceReclamation> getAll() { return repository.findAll(); }

    public List<ServiceReclamation> getAllActifs() { return repository.findByActifTrue(); }

    public Optional<ServiceReclamation> getById(Long id) { return repository.findById(id); }

    public ServiceReclamation create(ServiceReclamationRequest req) {
        if (repository.existsByCode(req.getCode().toUpperCase()))
            throw new RuntimeException("Code déjà utilisé : " + req.getCode());
        return repository.save(ServiceReclamation.builder()
                .code(req.getCode().toUpperCase())
                .libelle(req.getLibelle())
                .description(req.getDescription())
                .actif(req.isActif())
                .build());
    }

    public ServiceReclamation update(Long id, ServiceReclamationRequest req) {
        ServiceReclamation s = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("ServiceReclamation non trouvé : " + id));

        if (req.getCode() != null && !req.getCode().equalsIgnoreCase(s.getCode())) {
            if (repository.existsByCode(req.getCode().toUpperCase())) {
                throw new RuntimeException("Code déjà utilisé : " + req.getCode());
            }
            s.setCode(req.getCode().toUpperCase());
        }
        s.setLibelle(req.getLibelle());
        s.setDescription(req.getDescription());
        s.setActif(req.isActif());
        return repository.save(s);
    }

    public ServiceReclamation setActif(Long id, boolean actif) {
        ServiceReclamation s = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("ServiceReclamation non trouvé : " + id));
        s.setActif(actif);
        return repository.save(s);
    }

    public void delete(Long id) {
        if (!repository.existsById(id))
            throw new RuntimeException("ServiceReclamation non trouvé : " + id);
        repository.deleteById(id);
    }
}