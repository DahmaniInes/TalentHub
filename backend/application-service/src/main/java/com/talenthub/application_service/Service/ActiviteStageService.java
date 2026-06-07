package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.ActiviteStage;
import com.talenthub.application_service.Entity.ProjetStage;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.ActiviteStageRepository;
import com.talenthub.application_service.Repository.ProjetStageRepository;
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
public class ActiviteStageService {

    private final ActiviteStageRepository activiteRepo;
    private final ProjetStageRepository   projetRepo;
    private final UtilisateurRepository   utilisateurRepo;
    private final ProjetStageService      projetService;

    public List<ActiviteStage> getByProjet(Long projetId) {
        return activiteRepo.findByProjetId(projetId);
    }

    public List<ActiviteStage> getAll() {
        return activiteRepo.findAll();
    }

    public ActiviteStage getById(Long id) {
        return activiteRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Activité non trouvée: " + id));
    }

    public ActiviteStage create(Map<String, Object> body) {
        Long projetId = Long.valueOf(body.get("projetId").toString());
        ProjetStage projet = projetRepo.findById(projetId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet non trouvé: " + projetId));

        ActiviteStage a = ActiviteStage.builder()
                .titre(str(body, "titre"))
                .description(str(body, "description"))
                .statut(body.containsKey("statut") ? str(body, "statut") : "A_FAIRE")
                .avancement(0)
                .projet(projet)
                .build();

        if (body.containsKey("commentaire")) a.setCommentaire(str(body, "commentaire"));
        if (body.containsKey("dateDebut") && body.get("dateDebut") != null)
            a.setDateDebut(LocalDate.parse(body.get("dateDebut").toString()));
        if (body.containsKey("dateFin") && body.get("dateFin") != null)
            a.setDateFin(LocalDate.parse(body.get("dateFin").toString()));
        if (body.containsKey("createurId") && body.get("createurId") != null) {
            utilisateurRepo.findById(Long.valueOf(body.get("createurId").toString()))
                    .ifPresent(a::setCreateur);
        }
        if (body.containsKey("assigneId") && body.get("assigneId") != null) {
            utilisateurRepo.findById(Long.valueOf(body.get("assigneId").toString()))
                    .ifPresent(a::setAssigne);
        }

        ActiviteStage saved = activiteRepo.save(a);
        projetService.recalculerAvancement(projetId);
        return saved;
    }

    public ActiviteStage update(Long id, Map<String, Object> body) {
        ActiviteStage a = getById(id);
        if (body.containsKey("titre"))       a.setTitre(str(body, "titre"));
        if (body.containsKey("description")) a.setDescription(str(body, "description"));
        if (body.containsKey("statut"))      a.setStatut(str(body, "statut"));
        if (body.containsKey("commentaire")) a.setCommentaire(str(body, "commentaire"));
        if (body.containsKey("avancement") && body.get("avancement") != null)
            a.setAvancement(Integer.valueOf(body.get("avancement").toString()));
        if (body.containsKey("dateDebut") && body.get("dateDebut") != null)
            a.setDateDebut(LocalDate.parse(body.get("dateDebut").toString()));
        if (body.containsKey("dateFin") && body.get("dateFin") != null)
            a.setDateFin(LocalDate.parse(body.get("dateFin").toString()));
        if (body.containsKey("assigneId") && body.get("assigneId") != null)
            utilisateurRepo.findById(Long.valueOf(body.get("assigneId").toString()))
                    .ifPresent(a::setAssigne);

        ActiviteStage saved = activiteRepo.save(a);
        projetService.recalculerAvancement(a.getProjet().getId());
        return saved;
    }

    public void delete(Long id) {
        ActiviteStage a = getById(id);
        Long projetId = a.getProjet().getId();
        activiteRepo.deleteById(id);
        projetService.recalculerAvancement(projetId);
    }

    private String str(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v != null ? v.toString() : null;
    }


    public List<ActiviteStage> getByUserId(Long userId) {
        return activiteRepo.findByUserId(userId);
    }
}