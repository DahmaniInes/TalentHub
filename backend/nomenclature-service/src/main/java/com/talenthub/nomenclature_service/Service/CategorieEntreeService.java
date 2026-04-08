package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.DTO.NomenclatureRequest;
import com.talenthub.nomenclature_service.Entity.CategorieEntree;
import com.talenthub.nomenclature_service.Repository.CategorieEntreeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @Transactional
public class CategorieEntreeService {

    private final CategorieEntreeRepository repo;
    public CategorieEntreeService(CategorieEntreeRepository repo) { this.repo = repo; }

    public List<CategorieEntree> getAll() { return repo.findAll(); }
    public List<CategorieEntree> getAllActifs() { return repo.findByActifTrue(); }

    public CategorieEntree create(NomenclatureRequest req) {
        if (repo.existsByCode(req.getCode()))
            throw new RuntimeException("Code déjà utilisé : " + req.getCode());
        return repo.save(CategorieEntree.builder()
                .code(req.getCode().toUpperCase()).libelle(req.getLibelle())
                .description(req.getDescription()).couleur(req.getCouleur())
                .actif(req.isActif()).build());
    }

    public CategorieEntree update(Long id, NomenclatureRequest req) {
        CategorieEntree c = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Non trouvé : " + id));
        c.setLibelle(req.getLibelle());
        c.setDescription(req.getDescription());
        c.setCouleur(req.getCouleur());
        c.setActif(req.isActif());
        return repo.save(c);
    }

    public void delete(Long id) { repo.deleteById(id); }
}