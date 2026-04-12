package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Client;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Repository.ClientRepository;
import com.talenthub.application_service.Repository.ProjetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjetService {

    private final ProjetRepository projetRepository;
    private final ClientRepository clientRepository;

    @Transactional(readOnly = true)
    public List<Projet> getAll() {
        return projetRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Projet> getByClient(Long clientId) {
        return projetRepository.findByClientId(clientId);
    }

    @Transactional(readOnly = true)
    public List<Projet> getByStatut(String statut) {
        return projetRepository.findByStatut(statut);
    }

    @Transactional(readOnly = true)
    public List<Projet> getByMembre(Long userId) {
        return projetRepository.findByMembreUtilisateurId(userId);
    }

    @Transactional(readOnly = true)
    public Projet getById(Long id) {
        return projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé: " + id));
    }

    @Transactional(readOnly = true)
    public Projet getByIdWithDetails(Long id) {
        return projetRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé: " + id));
    }

    @Transactional
    public Projet create(Projet projet, Long clientId) {
        if (clientId != null) {
            Client client = clientRepository.findById(clientId)
                    .orElseThrow(() -> new RuntimeException("Client non trouvé: " + clientId));
            projet.setClient(client);
        }
        // Générer numéro automatique si absent
        if (projet.getNumeroProjet() == null || projet.getNumeroProjet().isBlank()) {
            long count = projetRepository.count() + 1;
            projet.setNumeroProjet(String.format("PRJ-%04d", count));
        }
        return projetRepository.save(projet);
    }

    @Transactional
    public Projet update(Long id, Projet details, Long clientId) {
        Projet existing = getById(id);
        existing.setNom(details.getNom());
        existing.setDescription(details.getDescription());
        existing.setNumeroProjet(details.getNumeroProjet());
        existing.setCouleur(details.getCouleur());
        existing.setDateDebut(details.getDateDebut());
        existing.setDateFin(details.getDateFin());
        existing.setDateFinReelle(details.getDateFinReelle());
        existing.setStatut(details.getStatut());
        existing.setAvancement(details.getAvancement());
        existing.setBudgetPrevu(details.getBudgetPrevu());
        existing.setBudgetConsomme(details.getBudgetConsomme());
        existing.setQuotaHoraire(details.getQuotaHoraire());
        existing.setTypeBudget(details.getTypeBudget());
        existing.setVisible(details.isVisible());
        existing.setFacturable(details.isFacturable());
        existing.setAutoriserActivitesGlobales(details.isAutoriserActivitesGlobales());
        existing.setResponsableKeycloakId(details.getResponsableKeycloakId());
        existing.setProjetAdmins(details.getProjetAdmins());
        if (clientId != null) {
            Client client = clientRepository.findById(clientId)
                    .orElseThrow(() -> new RuntimeException("Client non trouvé: " + clientId));
            existing.setClient(client);
        }
        return projetRepository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        projetRepository.deleteById(id);
    }
}