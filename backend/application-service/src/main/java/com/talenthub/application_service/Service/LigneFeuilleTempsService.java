// Service/LigneFeuilleTempsService.java — CORRIGÉ sans projetNom/activiteNom/clientNom
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

    public List<LigneFeuilleTemps> getAllLignes() { return repository.findAll(); }

    public Optional<LigneFeuilleTemps> getLigneById(Long id) { return repository.findById(id); }

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

        // ✅ IDs uniquement — aucun setter de nom
        ligne.setDate(details.getDate());
        ligne.setProjetId(details.getProjetId());
        ligne.setActiviteId(details.getActiviteId());
        ligne.setClientId(details.getClientId());
        ligne.setHeureDebut(details.getHeureDebut());
        ligne.setHeureFin(details.getHeureFin());
        ligne.setMinutesTravaillees(details.getMinutesTravaillees());
        ligne.setMinutesSupplementaires(details.getMinutesSupplementaires());
        ligne.setCommentaire(details.getCommentaire());
        ligne.setEstWeekend(details.isEstWeekend());

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