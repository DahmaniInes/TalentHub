package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.DTO.NomenclatureRequest;
import com.talenthub.nomenclature_service.Entity.StatutFeuilleTemps;
import com.talenthub.nomenclature_service.Repository.StatutFeuilleTempsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @Transactional
public class StatutFeuilleTempsService {

    private final StatutFeuilleTempsRepository repo;
    public StatutFeuilleTempsService(StatutFeuilleTempsRepository repo) { this.repo = repo; }

    public List<StatutFeuilleTemps> getAll() { return repo.findAll(); }
    public List<StatutFeuilleTemps> getAllActifs() { return repo.findByActifTrue(); }

    public StatutFeuilleTemps create(NomenclatureRequest req) {
        if (repo.existsByCode(req.getCode()))
            throw new RuntimeException("Code déjà utilisé : " + req.getCode());
        return repo.save(StatutFeuilleTemps.builder()
                .code(req.getCode().toUpperCase()).libelle(req.getLibelle())
                .description(req.getDescription()).couleur(req.getCouleur())
                .actif(req.isActif()).build());
    }

    public StatutFeuilleTemps update(Long id, NomenclatureRequest req) {
        StatutFeuilleTemps s = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Non trouvé : " + id));
        s.setLibelle(req.getLibelle());
        s.setDescription(req.getDescription());
        s.setCouleur(req.getCouleur());
        s.setActif(req.isActif());
        return repo.save(s);
    }

    public void delete(Long id) { repo.deleteById(id); }
}