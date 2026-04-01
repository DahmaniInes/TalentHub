package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Demande;
import com.talenthub.application_service.Repository.DemandeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.talenthub.application_service.Exception.ResourceNotFoundException;

import java.util.List;
import java.util.Optional;
// 3. DemandeService.java
@Service
@Transactional
public class DemandeService {

    private final DemandeRepository repository;

    public DemandeService(DemandeRepository repository) {
        this.repository = repository;
    }

    public List<Demande> getAllDemandes() {
        return repository.findAll();
    }

    public Optional<Demande> getDemandeById(Long id) {
        return repository.findById(id);
    }

    public List<Demande> getDemandesByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurId(utilisateurId);
    }

    public Demande createDemande(Demande demande) {
        return repository.save(demande);
    }

    public Demande updateDemande(Long id, Demande demandeDetails) {
        Demande demande = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande non trouvée avec id: " + id));

        demande.setSujet(demandeDetails.getSujet());
        demande.setDescription(demandeDetails.getDescription());
        demande.setDateDebut(demandeDetails.getDateDebut());
        demande.setDateFin(demandeDetails.getDateFin());
        demande.setNbJours(demandeDetails.getNbJours());
        demande.setCommentaireRH(demandeDetails.getCommentaireRH());
        demande.setPieceJointeUrl(demandeDetails.getPieceJointeUrl());
        demande.setStatutDemandeId(demandeDetails.getStatutDemandeId());
        demande.setTypeDemandeId(demandeDetails.getTypeDemandeId());
        demande.setTraitePar(demandeDetails.getTraitePar());

        return repository.save(demande);
    }

    public void deleteDemande(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Demande non trouvée avec id: " + id);
        }
        repository.deleteById(id);
    }
}