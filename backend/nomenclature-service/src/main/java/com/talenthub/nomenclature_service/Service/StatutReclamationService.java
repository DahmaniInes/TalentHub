// nomenclature-service/.../Service/StatutReclamationService.java
package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.DTO.StatutReclamationRequest;
import com.talenthub.nomenclature_service.Entity.StatutReclamation;
import com.talenthub.nomenclature_service.Repository.StatutReclamationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class StatutReclamationService {

    private final StatutReclamationRepository repository;

    public StatutReclamationService(StatutReclamationRepository repository) {
        this.repository = repository;
    }

    public List<StatutReclamation> getAll() { return repository.findAll(); }

    public List<StatutReclamation> getAllActifs() { return repository.findByActifTrue(); }

    public Optional<StatutReclamation> getById(Long id) { return repository.findById(id); }

    public StatutReclamation create(StatutReclamationRequest req) {
        if (repository.existsByCode(req.getCode().toUpperCase()))
            throw new RuntimeException("Code déjà utilisé : " + req.getCode());
        return repository.save(StatutReclamation.builder()
                .code(req.getCode().toUpperCase())
                .libelle(req.getLibelle())
                .description(req.getDescription())
                .actif(req.isActif())
                .build());
    }

    public StatutReclamation update(Long id, StatutReclamationRequest req) {
        StatutReclamation s = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("StatutReclamation non trouvé : " + id));

        // ✅ Code maintenant modifiable — vérifier l'unicité si changé
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

    public StatutReclamation setActif(Long id, boolean actif) {
        StatutReclamation s = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("StatutReclamation non trouvé : " + id));
        s.setActif(actif);
        return repository.save(s);
    }

    public void delete(Long id) {
        if (!repository.existsById(id))
            throw new RuntimeException("StatutReclamation non trouvé : " + id);
        repository.deleteById(id);
    }
}