package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.LigneFeuilleTemps;
import com.talenthub.application_service.Repository.LigneFeuilleTempsRepository;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

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

    public List<LigneFeuilleTemps> getLignesByFeuilleTemps(Long feuilleTempsId) {
        return repository.findByFeuilleTempsId(feuilleTempsId);
    }

    public LigneFeuilleTemps createLigne(LigneFeuilleTemps ligne) {
        return repository.save(ligne);
    }

    public LigneFeuilleTemps updateLigne(Long id, LigneFeuilleTemps details) {
        LigneFeuilleTemps ligne = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Ligne feuille de temps non trouvée avec id: " + id));

        // ✅ Noms corrects correspondant à l'entité LigneFeuilleTemps
        ligne.setDate(details.getDate());
        ligne.setCategorieCode(details.getCategorieCode());  // anciennement typeJour
        ligne.setHeureDebut(details.getHeureDebut());        // anciennement heureArrivee
        ligne.setHeureFin(details.getHeureFin());            // anciennement heureDepart
        ligne.setMinutesNormales(details.getMinutesNormales());       // anciennement heuresTravaillees
        ligne.setMinutesSupplementaires(details.getMinutesSupplementaires()); // anciennement heuresSup
        ligne.setMinutesAbsence(details.getMinutesAbsence());
        ligne.setCommentaire(details.getCommentaire());

        return repository.save(ligne);
    }

    public void deleteLigne(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException(
                    "Ligne feuille de temps non trouvée avec id: " + id);
        }
        repository.deleteById(id);
    }
}