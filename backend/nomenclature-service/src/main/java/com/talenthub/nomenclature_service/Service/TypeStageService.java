// nomenclature-service/.../Service/TypeStageService.java
package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.Entity.TypeStage;
import com.talenthub.nomenclature_service.Repository.TypeStageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class TypeStageService {

    private final TypeStageRepository repository;

    public TypeStageService(TypeStageRepository repository) {
        this.repository = repository;
    }

    public List<TypeStage> getAll()       { return repository.findAll(); }
    public List<TypeStage> getAllActifs()  { return repository.findByActifTrue(); }
    public Optional<TypeStage> getById(Long id) { return repository.findById(id); }

    public TypeStage create(TypeStage req) {
        if (repository.existsByCode(req.getCode()))
            throw new RuntimeException("Code déjà utilisé : " + req.getCode());
        req.setCode(req.getCode().toUpperCase());
        return repository.save(req);
    }

    public TypeStage update(Long id, TypeStage details) {
        TypeStage t = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("TypeStage non trouvé : " + id));
        t.setLibelle(details.getLibelle());
        t.setDescription(details.getDescription());
        t.setDureeMinSemaines(details.getDureeMinSemaines());
        t.setDureeMaxSemaines(details.getDureeMaxSemaines());
        t.setActif(details.isActif());
        return repository.save(t);
    }

    public TypeStage setActif(Long id, boolean actif) {
        TypeStage t = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("TypeStage non trouvé : " + id));
        t.setActif(actif);
        return repository.save(t);
    }

    public void delete(Long id) {
        if (!repository.existsById(id))
            throw new RuntimeException("TypeStage non trouvé : " + id);
        repository.deleteById(id);
    }
}