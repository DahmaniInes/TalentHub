package com.talenthub.application_service.Service;


import com.talenthub.application_service.Entity.Evaluation;
import com.talenthub.application_service.Repository.EvaluationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.talenthub.application_service.Exception.ResourceNotFoundException;

import java.util.List;
import java.util.Optional;
// 13. EvaluationService.java
@Service
@Transactional
public class EvaluationService {

    private final EvaluationRepository repository;

    public EvaluationService(EvaluationRepository repository) {
        this.repository = repository;
    }

    public List<Evaluation> getAllEvaluations() {
        return repository.findAll();
    }

    public Optional<Evaluation> getEvaluationById(Long id) {
        return repository.findById(id);
    }

    public List<Evaluation> getEvaluationsByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurId(utilisateurId);
    }

    public Evaluation createEvaluation(Evaluation evaluation) {
        return repository.save(evaluation);
    }

    public Evaluation updateEvaluation(Long id, Evaluation details) {
        Evaluation eval = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Évaluation non trouvée avec id: " + id));

        eval.setNoteGlobale(details.getNoteGlobale());
        eval.setNoteCompetences(details.getNoteCompetences());
        eval.setNotePonctualite(details.getNotePonctualite());
        eval.setNoteTravailEquipe(details.getNoteTravailEquipe());
        eval.setNoteInitiative(details.getNoteInitiative());
        eval.setNoteQualiteTravail(details.getNoteQualiteTravail());
        eval.setCommentaire(details.getCommentaire());
        eval.setPointsForts(details.getPointsForts());
        eval.setAxesAmelioration(details.getAxesAmelioration());
        eval.setObjectifsSuivant(details.getObjectifsSuivant());
        eval.setStatut(details.getStatut());

        return repository.save(eval);
    }

    public void deleteEvaluation(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Évaluation non trouvée avec id: " + id);
        }
        repository.deleteById(id);
    }
}
