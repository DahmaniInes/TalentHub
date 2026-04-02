package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.DTO.TypeDemandeRequest;
import com.talenthub.nomenclature_service.Entity.TypeDemande;
import com.talenthub.nomenclature_service.Repository.TypeDemandeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class TypeDemandeService {

    private final TypeDemandeRepository repository;

    public TypeDemandeService(TypeDemandeRepository repository) {
        this.repository = repository;
    }

    public List<TypeDemande> getAll() { return repository.findAll(); }
    public List<TypeDemande> getAllActifs() { return repository.findByActifTrue(); }
    public Optional<TypeDemande> getById(Long id) { return repository.findById(id); }

    public TypeDemande create(TypeDemandeRequest req) {
        if (repository.existsByCode(req.getCode()))
            throw new RuntimeException("Code déjà utilisé : " + req.getCode());
        return repository.save(TypeDemande.builder()
                .code(req.getCode().toUpperCase())
                .libelle(req.getLibelle())
                .description(req.getDescription())
                .actif(req.isActif())
                .build());
    }

    public TypeDemande update(Long id, TypeDemandeRequest req) {
        TypeDemande t = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("TypeDemande non trouvé : " + id));
        t.setLibelle(req.getLibelle());
        t.setDescription(req.getDescription());
        t.setActif(req.isActif());
        return repository.save(t);
    }

    public void delete(Long id) {
        if (!repository.existsById(id))
            throw new RuntimeException("TypeDemande non trouvé : " + id);
        repository.deleteById(id);
    }
}