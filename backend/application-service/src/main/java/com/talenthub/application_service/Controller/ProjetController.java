package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ProjetDTO;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Service.ProjetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/projets")
@RequiredArgsConstructor
public class ProjetController {

    private final ProjetService projetService;

    @GetMapping
    public ResponseEntity<List<ProjetDTO>> getAll(
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) Long membreId) {
        List<Projet> list;
        if (clientId != null)  list = projetService.getByClient(clientId);
        else if (statut != null) list = projetService.getByStatut(statut);
        else if (membreId != null) list = projetService.getByMembre(membreId);
        else list = projetService.getAll();
        return ResponseEntity.ok(list.stream().map(ProjetDTO::new).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjetDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new ProjetDTO(projetService.getByIdWithDetails(id)));
    }

    @PostMapping
    public ResponseEntity<ProjetDTO> create(@RequestBody Map<String, Object> body) {
        Projet projet = buildProjetFromBody(body);
        Long clientId = body.containsKey("clientId")
                ? Long.valueOf(body.get("clientId").toString()) : null;
        return new ResponseEntity<>(new ProjetDTO(projetService.create(projet, clientId)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjetDTO> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Projet details = buildProjetFromBody(body);
        Long clientId = body.containsKey("clientId")
                ? Long.valueOf(body.get("clientId").toString()) : null;
        return ResponseEntity.ok(new ProjetDTO(projetService.update(id, details, clientId)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projetService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private Projet buildProjetFromBody(Map<String, Object> body) {
        Projet p = new Projet();
        if (body.get("nom")          != null) p.setNom(body.get("nom").toString());
        if (body.get("description")  != null) p.setDescription(body.get("description").toString());
        if (body.get("couleur")      != null) p.setCouleur(body.get("couleur").toString());
        if (body.get("statut")       != null) p.setStatut(body.get("statut").toString());
        if (body.get("typeBudget")   != null) p.setTypeBudget(body.get("typeBudget").toString());
        if (body.get("responsableKeycloakId") != null)
            p.setResponsableKeycloakId(body.get("responsableKeycloakId").toString());
        if (body.get("budgetPrevu")  != null) p.setBudgetPrevu(Double.valueOf(body.get("budgetPrevu").toString()));
        if (body.get("quotaHoraire") != null) p.setQuotaHoraire(Double.valueOf(body.get("quotaHoraire").toString()));
        if (body.get("avancement")   != null) p.setAvancement(Integer.parseInt(body.get("avancement").toString()));
        if (body.get("visible")      != null) p.setVisible((Boolean) body.get("visible"));
        if (body.get("facturable")   != null) p.setFacturable((Boolean) body.get("facturable"));
        if (body.get("autoriserActivitesGlobales") != null)
            p.setAutoriserActivitesGlobales((Boolean) body.get("autoriserActivitesGlobales"));
        if (body.get("dateDebut") != null)
            p.setDateDebut(java.time.LocalDate.parse(body.get("dateDebut").toString()));
        if (body.get("dateFin") != null)
            p.setDateFin(java.time.LocalDate.parse(body.get("dateFin").toString()));
        return p;
    }
}
