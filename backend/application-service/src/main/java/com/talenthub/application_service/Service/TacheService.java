package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Tache;
import com.talenthub.application_service.Repository.TacheRepository;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

// 2. TacheService.java
@Service
@Transactional
public class TacheService {

    private final TacheRepository repository;

    public TacheService(TacheRepository repository) {
        this.repository = repository;
    }

    public List<Tache> getAllTaches() {
        return repository.findAll();
    }

    public Optional<Tache> getTacheById(Long id) {
        return repository.findById(id);
    }

    public List<Tache> getTachesByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurId(utilisateurId);
    }

    public List<Tache> getTachesByProjet(Long projetId) {
        return repository.findByProjetId(projetId);
    }

    public Tache createTache(Tache tache) {
        return repository.save(tache);
    }

    public Tache updateTache(Long id, Tache tacheDetails) {
        Tache tache = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tâche non trouvée avec id: " + id));

        tache.setTitre(tacheDetails.getTitre());
        tache.setDescription(tacheDetails.getDescription());
        tache.setPriorite(tacheDetails.getPriorite());
        tache.setDateEcheance(tacheDetails.getDateEcheance());
        tache.setDateDebutReelle(tacheDetails.getDateDebutReelle());
        tache.setDateFinReelle(tacheDetails.getDateFinReelle());
        tache.setHeuresEstimees(tacheDetails.getHeuresEstimees());
        tache.setHeuresPassees(tacheDetails.getHeuresPassees());
        tache.setStatutTacheId(tacheDetails.getStatutTacheId());
        tache.setUtilisateur(tacheDetails.getUtilisateur());
        tache.setProjet(tacheDetails.getProjet());

        return repository.save(tache);
    }

    public void deleteTache(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Tâche non trouvée avec id: " + id);
        }
        repository.deleteById(id);
    }
}