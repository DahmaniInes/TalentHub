package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Rapport;
import com.talenthub.application_service.Repository.RapportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.talenthub.application_service.Exception.ResourceNotFoundException;

import java.util.List;
import java.util.Optional;
// 5. RapportService.java
@Service
@Transactional
public class RapportService {

    private final RapportRepository repository;

    public RapportService(RapportRepository repository) {
        this.repository = repository;
    }

    public List<Rapport> getAllRapports() {
        return repository.findAll();
    }

    public Optional<Rapport> getRapportById(Long id) {
        return repository.findById(id);
    }

    public List<Rapport> getRapportsByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurId(utilisateurId);
    }

    public Rapport createRapport(Rapport rapport) {
        return repository.save(rapport);
    }

    public Rapport updateRapport(Long id, Rapport rapportDetails) {
        Rapport rapport = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rapport non trouvé avec id: " + id));

        rapport.setTitre(rapportDetails.getTitre());
        rapport.setPeriodeDebut(rapportDetails.getPeriodeDebut());
        rapport.setPeriodeFin(rapportDetails.getPeriodeFin());
        rapport.setParametres(rapportDetails.getParametres());
        rapport.setStatut(rapportDetails.getStatut());
        rapport.setFichierPath(rapportDetails.getFichierPath());
        rapport.setFichierNom(rapportDetails.getFichierNom());
        rapport.setFichierTaille(rapportDetails.getFichierTaille());
        rapport.setMessageErreur(rapportDetails.getMessageErreur());
        rapport.setTypeRapportId(rapportDetails.getTypeRapportId());

        return repository.save(rapport);
    }

    public void deleteRapport(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Rapport non trouvé avec id: " + id);
        }
        repository.deleteById(id);
    }
}