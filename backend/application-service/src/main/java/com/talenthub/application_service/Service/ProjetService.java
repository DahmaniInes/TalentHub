package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Repository.ProjetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import java.util.List;
import java.util.Optional;
// 6. ProjetService.java
@Service
@Transactional
public class ProjetService {

    private final ProjetRepository repository;

    public ProjetService(ProjetRepository repository) {
        this.repository = repository;
    }

    public List<Projet> getAllProjets() {
        return repository.findAll();
    }

    public Optional<Projet> getProjetById(Long id) {
        return repository.findById(id);
    }

    public Projet createProjet(Projet projet) {
        return repository.save(projet);
    }

    public Projet updateProjet(Long id, Projet projetDetails) {
        Projet projet = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Projet non trouvé avec id: " + id));

        projet.setNom(projetDetails.getNom());
        projet.setDescription(projetDetails.getDescription());
        projet.setDateDebut(projetDetails.getDateDebut());
        projet.setDateFin(projetDetails.getDateFin());
        projet.setDateFinReelle(projetDetails.getDateFinReelle());
        projet.setStatut(projetDetails.getStatut());
        projet.setAvancement(projetDetails.getAvancement());
        projet.setResponsableKeycloakId(projetDetails.getResponsableKeycloakId());
        projet.setBudgetPrevu(projetDetails.getBudgetPrevu());
        projet.setBudgetConsomme(projetDetails.getBudgetConsomme());

        return repository.save(projet);
    }

    public void deleteProjet(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Projet non trouvé avec id: " + id);
        }
        repository.deleteById(id);
    }
}