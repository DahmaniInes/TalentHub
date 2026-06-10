package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.StageDTO;
import com.talenthub.application_service.Entity.Stage;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.MembreEquipeRepository;
import com.talenthub.application_service.Repository.StageRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class StageService {

    private final StageRepository        stageRepo;
    private final UtilisateurRepository  utilisateurRepo;
    private final MembreEquipeRepository membreEquipeRepository;

    public List<StageDTO> getByUser(Long userId) {
        return stageRepo.findByUtilisateurId(userId)
                .stream().map(StageDTO::new).toList();
    }

    public StageDTO getById(Long id) {
        return new StageDTO(stageRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stage non trouvé: " + id)));
    }

    public StageDTO create(Long userId, Map<String, Object> body) {
        Utilisateur u = utilisateurRepo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur non trouvé: " + userId));

        // ✅ Plus de .statut() dans le builder — Stage n'a plus de champ statut String
        Stage s = Stage.builder()
                .utilisateur(u)
                .statutStageId(1L) // 1 = EN_COURS par défaut
                .build();

        return new StageDTO(applyBody(s, body));
    }

    public StageDTO update(Long id, Map<String, Object> body) {
        Stage s = stageRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stage non trouvé: " + id));
        return new StageDTO(applyBody(s, body));
    }

    // ✅ Changer statut via ID nomenclature uniquement
    public StageDTO changerStatut(Long id, Long nouveauStatutStageId) {
        Stage s = stageRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stage non trouvé: " + id));
        s.setStatutStageId(nouveauStatutStageId);
        return new StageDTO(stageRepo.save(s));
    }

    public void delete(Long id) {
        if (!stageRepo.existsById(id))
            throw new ResourceNotFoundException("Stage non trouvé: " + id);
        stageRepo.deleteById(id);
    }

    public List<Long> getProjetIdsByStage(Long stageId) {
        return membreEquipeRepository.findByStageId(stageId)
                .stream().map(m -> m.getProjet().getId()).toList();
    }

    private Stage applyBody(Stage s, Map<String, Object> body) {
        if (body.containsKey("typeStageId") && body.get("typeStageId") != null)
            s.setTypeStageId(Long.valueOf(body.get("typeStageId").toString()));

        // ✅ Statut uniquement via ID nomenclature
        if (body.containsKey("statutStageId") && body.get("statutStageId") != null)
            s.setStatutStageId(Long.valueOf(body.get("statutStageId").toString()));

        if (body.containsKey("dateDebut") && body.get("dateDebut") != null)
            s.setDateDebut(LocalDate.parse(body.get("dateDebut").toString()));
        if (body.containsKey("dateFin") && body.get("dateFin") != null)
            s.setDateFin(LocalDate.parse(body.get("dateFin").toString()));
        if (body.containsKey("dateSoutenance") && body.get("dateSoutenance") != null)
            s.setDateSoutenance(LocalDate.parse(
                    body.get("dateSoutenance").toString()));
        if (body.containsKey("description"))
            s.setDescription(body.get("description") != null
                    ? body.get("description").toString() : null);

        return stageRepo.save(s);
    }





}