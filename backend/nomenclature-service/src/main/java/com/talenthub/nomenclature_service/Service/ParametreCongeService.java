package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.DTO.ParametreCongeRequest;
import com.talenthub.nomenclature_service.Entity.ParametreConge;
import com.talenthub.nomenclature_service.Repository.ParametreCongeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ParametreCongeService {

    private final ParametreCongeRepository repository;

    public ParametreCongeService(ParametreCongeRepository repository) {
        this.repository = repository;
    }

    /** Un seul enregistrement actif — créé avec une valeur par défaut s'il n'existe pas encore. */
    public ParametreConge getActuel() {
        return repository.findAll().stream().findFirst()
                .orElseGet(() -> repository.save(
                        ParametreConge.builder().tauxMensuel(1.8).build()));
    }

    public ParametreConge update(ParametreCongeRequest req) {
        ParametreConge p = getActuel();
        p.setTauxMensuel(req.getTauxMensuel());
        return repository.save(p);
    }
}