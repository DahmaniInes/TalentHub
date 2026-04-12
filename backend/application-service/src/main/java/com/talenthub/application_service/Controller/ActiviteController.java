package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ActiviteDTO;
import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Service.ActiviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/activites")
@RequiredArgsConstructor
public class ActiviteController {

    private final ActiviteService activiteService;

    @GetMapping("/projet/{projetId}")
    public ResponseEntity<List<ActiviteDTO>> getByProjet(
            @PathVariable Long projetId,
            @RequestParam(required = false) Long statutId) {
        List<Activité> list = statutId != null
                ? activiteService.getByProjetAndStatut(projetId, statutId)
                : activiteService.getByProjet(projetId);
        // Enrichissement avec libellé statut depuis nomenclature-service
        return ResponseEntity.ok(list.stream().map(activiteService::toDTO).toList());
    }

    @GetMapping("/utilisateur/{userId}")
    public ResponseEntity<List<ActiviteDTO>> getByUtilisateur(@PathVariable Long userId) {
        return ResponseEntity.ok(
                activiteService.getByUtilisateur(userId).stream().map(activiteService::toDTO).toList()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActiviteDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(activiteService.toDTO(activiteService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ActiviteDTO> create(@RequestBody Map<String, Object> body) {
        Activité a = buildFromBody(body);
        Long projetId      = body.containsKey("projetId")      ? Long.valueOf(body.get("projetId").toString())      : null;
        Long utilisateurId = body.containsKey("utilisateurId") ? Long.valueOf(body.get("utilisateurId").toString()) : null;
        return new ResponseEntity<>(activiteService.toDTO(activiteService.create(a, projetId, utilisateurId)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ActiviteDTO> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Activité details = buildFromBody(body);
        Long utilisateurId = body.containsKey("utilisateurId") ? Long.valueOf(body.get("utilisateurId").toString()) : null;
        return ResponseEntity.ok(activiteService.toDTO(activiteService.update(id, details, utilisateurId)));
    }

    // ✅ PATCH statut — reçoit statutId (Long) pas un enum String
    @PatchMapping("/{id}/statut")
    public ResponseEntity<ActiviteDTO> changerStatut(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long statutId = Long.valueOf(body.get("statutId").toString());
        return ResponseEntity.ok(activiteService.toDTO(activiteService.changerStatut(id, statutId)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        activiteService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private Activité buildFromBody(Map<String, Object> body) {
        Activité a = new Activité();
        if (body.get("nom")             != null) a.setNom(body.get("nom").toString());
        if (body.get("description")     != null) a.setDescription(body.get("description").toString());
        if (body.get("couleur")         != null) a.setCouleur(body.get("couleur").toString());
        if (body.get("typeBudget")      != null) a.setTypeBudget(body.get("typeBudget").toString());
        if (body.get("budget")          != null) a.setBudget(Double.valueOf(body.get("budget").toString()));
        if (body.get("quotaHoraire")    != null) a.setQuotaHoraire(Double.valueOf(body.get("quotaHoraire").toString()));
        if (body.get("priorite")        != null) a.setPriorite(Integer.parseInt(body.get("priorite").toString()));
        if (body.get("heuresEstimees")  != null) a.setHeuresEstimees(Double.valueOf(body.get("heuresEstimees").toString()));
        if (body.get("heuresPassees")   != null) a.setHeuresPassees(Double.valueOf(body.get("heuresPassees").toString()));
        if (body.get("visible")         != null) a.setVisible((Boolean) body.get("visible"));
        if (body.get("facturable")      != null) a.setFacturable((Boolean) body.get("facturable"));
        // ✅ statutActiviteId = Long (pas enum)
        if (body.get("statutActiviteId") != null)
            a.setStatutActiviteId(Long.valueOf(body.get("statutActiviteId").toString()));
        if (body.get("dateEcheance") != null)
            a.setDateEcheance(java.time.LocalDate.parse(body.get("dateEcheance").toString()));
        if (body.get("creePar") != null) a.setCreePar(body.get("creePar").toString());
        return a;
    }
}
