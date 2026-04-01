package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.LigneFeuilleTemps;
import com.talenthub.application_service.Repository.LigneFeuilleTempsRepository;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
// 12. LigneFeuilleTempsService.java
@Service
@Transactional
public class LigneFeuilleTempsService {

    private final LigneFeuilleTempsRepository repository;

    public LigneFeuilleTempsService(LigneFeuilleTempsRepository repository) {
        this.repository = repository;
    }

    public List<LigneFeuilleTemps> getAllLignes() {
        return repository.findAll();
    }

    public Optional<LigneFeuilleTemps> getLigneById(Long id) {
        return repository.findById(id);
    }

    public LigneFeuilleTemps createLigne(LigneFeuilleTemps ligne) {
        return repository.save(ligne);
    }

    public LigneFeuilleTemps updateLigne(Long id, LigneFeuilleTemps details) {
        LigneFeuilleTemps ligne = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ligne feuille de temps non trouvée avec id: " + id));

        ligne.setDate(details.getDate());
        ligne.setTypeJour(details.getTypeJour());
        ligne.setHeureArrivee(details.getHeureArrivee());
        ligne.setHeureDepart(details.getHeureDepart());
        ligne.setHeuresTravaillees(details.getHeuresTravaillees());
        ligne.setHeuresSup(details.getHeuresSup());
        ligne.setCommentaire(details.getCommentaire());

        return repository.save(ligne);
    }

    public void deleteLigne(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Ligne feuille de temps non trouvée avec id: " + id);
        }
        repository.deleteById(id);
    }
}