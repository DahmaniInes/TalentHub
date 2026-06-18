// nomenclature-service/.../Service/TypeStageService.java
package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.Entity.TypeStage;
import com.talenthub.nomenclature_service.Repository.TypeStageRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
@Slf4j
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

        // 🔍 DEBUG — log de ce qui arrive réellement du JSON désérialisé
        log.info("[UPDATE TypeStage] id={}, code AVANT en base='{}', code REÇU du body='{}'",
                id, t.getCode(), details.getCode());

        if (details.getCode() != null && !details.getCode().equalsIgnoreCase(t.getCode())) {
            boolean exists = repository.existsByCode(details.getCode().toUpperCase());
            log.info("[UPDATE TypeStage] existsByCode('{}') = {}", details.getCode().toUpperCase(), exists);
            if (exists) {
                throw new RuntimeException("Code déjà utilisé : " + details.getCode());
            }
            t.setCode(details.getCode().toUpperCase());
            log.info("[UPDATE TypeStage] code APRÈS setCode='{}'", t.getCode());
        } else {
            log.info("[UPDATE TypeStage] condition de changement de code NON remplie (code identique ou null)");
        }

        t.setLibelle(details.getLibelle());
        t.setDescription(details.getDescription());
        t.setDureeMinSemaines(details.getDureeMinSemaines());
        t.setDureeMaxSemaines(details.getDureeMaxSemaines());
        t.setActif(details.isActif());

        TypeStage saved = repository.save(t);
        log.info("[UPDATE TypeStage] code APRÈS save() en mémoire='{}'", saved.getCode());

        return saved;
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