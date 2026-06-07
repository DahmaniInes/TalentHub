package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.ProjetStage;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
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
public class ProjetStageService {

    private final ProjetStageRepository projetRepo;
    private final UtilisateurRepository utilisateurRepo;

    public List<ProjetStage> getAll() { return projetRepo.findAll(); }

    public ProjetStage getById(Long id) {
        return projetRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Projet non trouvé: " + id));
    }

    public List<ProjetStage> getByStagiaire(Long stagiaireId) {
        return projetRepo.findByStagiaireId(stagiaireId);
    }

    public List<ProjetStage> getBySuperviseur(Long superviseurId) {
        return projetRepo.findBySuperviseurId(superviseurId);
    }

    public ProjetStage create(Map<String, Object> body) {
        ProjetStage p = ProjetStage.builder()
                .titre(str(body, "titre"))
                .description(str(body, "description"))
                .statut(body.containsKey("statut") ? str(body, "statut") : "EN_COURS")
                .avancement(0)
                .build();
        if (body.containsKey("dateDebut") && body.get("dateDebut") != null)
            p.setDateDebut(LocalDate.parse(body.get("dateDebut").toString()));
        if (body.containsKey("dateFin") && body.get("dateFin") != null)
            p.setDateFin(LocalDate.parse(body.get("dateFin").toString()));
        ProjetStage saved = projetRepo.save(p);
        // Assigner des stagiaires
        if (body.containsKey("stagiaireIds")) {
            List<Long> ids = ((List<?>) body.get("stagiaireIds")).stream()
                    .map(o -> Long.valueOf(o.toString())).toList();
            saved.setStagiaires(utilisateurRepo.findAllById(ids));
            projetRepo.save(saved);
        }
        return saved;
    }

    public ProjetStage update(Long id, Map<String, Object> body) {
        ProjetStage p = getById(id);
        if (body.containsKey("titre"))       p.setTitre(str(body, "titre"));
        if (body.containsKey("description")) p.setDescription(str(body, "description"));
        if (body.containsKey("statut"))      p.setStatut(str(body, "statut"));
        if (body.containsKey("avancement") && body.get("avancement") != null)
            p.setAvancement(Integer.valueOf(body.get("avancement").toString()));
        if (body.containsKey("dateDebut") && body.get("dateDebut") != null)
            p.setDateDebut(LocalDate.parse(body.get("dateDebut").toString()));
        if (body.containsKey("dateFin") && body.get("dateFin") != null)
            p.setDateFin(LocalDate.parse(body.get("dateFin").toString()));
        if (body.containsKey("stagiaireIds")) {
            List<Long> ids = ((List<?>) body.get("stagiaireIds")).stream()
                    .map(o -> Long.valueOf(o.toString())).toList();
            p.setStagiaires(utilisateurRepo.findAllById(ids));
        }
        return projetRepo.save(p);
    }

    // Recalcul automatique de l'avancement du projet
    public void recalculerAvancement(Long projetId) {
        ProjetStage p = getById(projetId);
        List<com.talenthub.application_service.Entity.ActiviteStage> activites = p.getActivites();
        if (activites.isEmpty()) return;
        int moyenne = (int) activites.stream()
                .mapToInt(a -> a.getAvancement() != null ? a.getAvancement() : 0)
                .average().orElse(0);
        p.setAvancement(moyenne);
        projetRepo.save(p);
    }

    public void delete(Long id) {
        if (!projetRepo.existsById(id))
            throw new ResourceNotFoundException("Projet non trouvé: " + id);
        projetRepo.deleteById(id);
    }

    private String str(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v != null ? v.toString() : null;
    }



    // Ajouter cette méthode dans ProjetStageService.java
    public ProjetStage assignerAStagiaire(Long projetId, Long stagiaireId) {
        ProjetStage p = getById(projetId);
        com.talenthub.application_service.Entity.Utilisateur stagiaire =
                utilisateurRepo.findById(stagiaireId)
                        .orElseThrow(() -> new ResourceNotFoundException("Stagiaire non trouvé: " + stagiaireId));
        if (!p.getStagiaires().contains(stagiaire)) {
            p.getStagiaires().add(stagiaire);
        }
        return projetRepo.save(p);
    }



}