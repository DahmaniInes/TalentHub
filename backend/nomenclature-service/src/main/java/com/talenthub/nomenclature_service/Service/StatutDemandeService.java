package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.DTO.StatutDemandeRequest;
import com.talenthub.nomenclature_service.Entity.StatutDemande;
import com.talenthub.nomenclature_service.Repository.StatutDemandeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class StatutDemandeService {

    private final StatutDemandeRepository repository;

    public StatutDemandeService(StatutDemandeRepository repository) {
        this.repository = repository;
    }

    public List<StatutDemande> getAll() { return repository.findAll(); }
    public List<StatutDemande> getAllActifs() { return repository.findByActifTrue(); }
    public Optional<StatutDemande> getById(Long id) { return repository.findById(id); }

    public StatutDemande create(StatutDemandeRequest req) {
        if (repository.existsByCode(req.getCode()))
            throw new RuntimeException("Code déjà utilisé : " + req.getCode());
        return repository.save(StatutDemande.builder()
                .code(req.getCode().toUpperCase())
                .libelle(req.getLibelle())
                .couleur(req.getCouleur())
                .actif(req.isActif())
                .build());
    }

    public StatutDemande update(Long id, StatutDemandeRequest req) {
        StatutDemande s = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("StatutDemande non trouvé : " + id));
        s.setLibelle(req.getLibelle());
        s.setCouleur(req.getCouleur());
        s.setActif(req.isActif());
        return repository.save(s);
    }

    public void delete(Long id) {
        if (!repository.existsById(id))
            throw new RuntimeException("StatutDemande non trouvé : " + id);
        repository.deleteById(id);
    }
}