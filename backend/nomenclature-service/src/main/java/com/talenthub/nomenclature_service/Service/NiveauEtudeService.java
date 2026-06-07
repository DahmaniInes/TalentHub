package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.DTO.NomenclatureAcademiqueRequest;
import com.talenthub.nomenclature_service.Entity.NiveauEtude;
import com.talenthub.nomenclature_service.Repository.NiveauEtudeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class NiveauEtudeService {

    private final NiveauEtudeRepository repository;

    public List<NiveauEtude> getAll()      { return repository.findAll(); }
    public List<NiveauEtude> getAllActifs() { return repository.findByActifTrueOrderByOrdreAffichageAsc(); }
    public Optional<NiveauEtude> getById(Long id) { return repository.findById(id); }

    public NiveauEtude create(NomenclatureAcademiqueRequest req) {
        if (repository.existsByCode(req.getCode().toUpperCase()))
            throw new RuntimeException("Code déjà utilisé : " + req.getCode());
        return repository.save(NiveauEtude.builder()
                .code(req.getCode().toUpperCase())
                .libelle(req.getLibelle())
                .description(req.getDescription())
                .ordreAffichage(req.getOrdreAffichage())
                .actif(req.isActif())
                .build());
    }

    public NiveauEtude update(Long id, NomenclatureAcademiqueRequest req) {
        NiveauEtude n = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Niveau non trouvé : " + id));
        n.setLibelle(req.getLibelle());
        n.setDescription(req.getDescription());
        n.setOrdreAffichage(req.getOrdreAffichage());
        n.setActif(req.isActif());
        return repository.save(n);
    }

    public NiveauEtude setActif(Long id, boolean actif) {
        NiveauEtude n = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Niveau non trouvé : " + id));
        n.setActif(actif);
        return repository.save(n);
    }

    public void delete(Long id) { repository.deleteById(id); }
}