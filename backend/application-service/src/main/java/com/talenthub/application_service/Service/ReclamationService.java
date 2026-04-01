package com.talenthub.application_service.Service;


import com.talenthub.application_service.Entity.Reclamation;
import com.talenthub.application_service.Repository.ReclamationRepository;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;


// 4. ReclamationService.java
@Service
@Transactional
public class ReclamationService {

    private final ReclamationRepository repository;

    public ReclamationService(ReclamationRepository repository) {
        this.repository = repository;
    }

    public List<Reclamation> getAllReclamations() {
        return repository.findAll();
    }

    public Optional<Reclamation> getReclamationById(Long id) {
        return repository.findById(id);
    }

    public List<Reclamation> getReclamationsByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurId(utilisateurId);
    }

    public Reclamation createReclamation(Reclamation reclamation) {
        return repository.save(reclamation);
    }

    public Reclamation updateReclamation(Long id, Reclamation reclamationDetails) {
        Reclamation reclamation = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Réclamation non trouvée avec id: " + id));

        reclamation.setTitre(reclamationDetails.getTitre());
        reclamation.setDescription(reclamationDetails.getDescription());
        reclamation.setPriorite(reclamationDetails.getPriorite());
        reclamation.setStatut(reclamationDetails.getStatut());
        reclamation.setReponseRH(reclamationDetails.getReponseRH());
        reclamation.setTraitePar(reclamationDetails.getTraitePar());
        reclamation.setPieceJointeUrl(reclamationDetails.getPieceJointeUrl());
        reclamation.setCategorieReclamationId(reclamationDetails.getCategorieReclamationId());

        return repository.save(reclamation);
    }

    public void deleteReclamation(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Réclamation non trouvée avec id: " + id);
        }
        repository.deleteById(id);
    }
}
