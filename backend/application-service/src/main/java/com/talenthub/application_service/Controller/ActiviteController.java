// ActiviteController.java — REMPLACE COMPLET
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

    // ✅ Plus de projetId dans les params — filtrage uniquement par statut/utilisateur/priorité
    @GetMapping
    public ResponseEntity<List<ActiviteDTO>> getAll(
            @RequestParam(required = false) Long statutId,
            @RequestParam(required = false) Long utilisateurId,
            @RequestParam(required = false) Integer priorite,
            @RequestParam(required = false) Boolean globalesUniquement) {
        return ResponseEntity.ok(activiteService.getAllFiltered(
                statutId, utilisateurId, priorite,
                Boolean.TRUE.equals(globalesUniquement)));
    }

    // ✅ Activités d'un projet (via la relation Many-to-Many côté Projet)
    @GetMapping("/projet/{projetId}")
    public ResponseEntity<List<ActiviteDTO>> getByProjet(@PathVariable Long projetId) {
        return ResponseEntity.ok(
                activiteService.getByProjet(projetId).stream()
                        .map(activiteService::toDTO).toList());
    }

    @GetMapping("/globales")
    public ResponseEntity<List<ActiviteDTO>> getGlobales() {
        return ResponseEntity.ok(activiteService.getGlobales());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActiviteDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(activiteService.toDTO(activiteService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<ActiviteDTO> create(@RequestBody Map<String, Object> body) {
        Activité activite    = buildFromBody(body);
        Long utilisateurId   = extractLong(body, "utilisateurId");
        List<Long> groupeIds = extractLongList(body, "groupeIds");
        return new ResponseEntity<>(
                activiteService.toDTO(activiteService.create(activite, utilisateurId, groupeIds)),
                HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ActiviteDTO> update(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        Activité details     = buildFromBody(body);
        Long utilisateurId   = extractLong(body, "utilisateurId");
        List<Long> groupeIds = extractLongList(body, "groupeIds");
        return ResponseEntity.ok(
                activiteService.toDTO(activiteService.update(id, details, utilisateurId, groupeIds)));
    }

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

    @DeleteMapping("/bulk")
    public ResponseEntity<Void> deleteBulk(@RequestBody List<Long> ids) {
        ids.forEach(activiteService::delete);
        return ResponseEntity.noContent().build();
    }

    private Long extractLong(Map<String, Object> body, String key) {
        return body.containsKey(key) && body.get(key) != null
                ? Long.valueOf(body.get(key).toString()) : null;
    }

    @SuppressWarnings("unchecked")
    private List<Long> extractLongList(Map<String, Object> body, String key) {
        if (!body.containsKey(key) || body.get(key) == null) return null;
        Object raw = body.get(key);
        if (raw instanceof List<?> list)
            return list.stream().map(o -> Long.valueOf(o.toString())).toList();
        return null;
    }

    private Activité buildFromBody(Map<String, Object> body) {
        Activité a = new Activité();
        if (body.get("nom")              != null) a.setNom(body.get("nom").toString());
        if (body.get("description")      != null) a.setDescription(body.get("description").toString());
        if (body.get("couleur")          != null) a.setCouleur(body.get("couleur").toString());
        if (body.get("typeBudget")       != null) a.setTypeBudget(body.get("typeBudget").toString());
        if (body.get("budget")           != null) a.setBudget(Double.valueOf(body.get("budget").toString()));
        if (body.get("quotaHoraire")     != null) a.setQuotaHoraire(Double.valueOf(body.get("quotaHoraire").toString()));
        if (body.get("priorite")         != null) a.setPriorite(Integer.parseInt(body.get("priorite").toString()));
        if (body.get("heuresEstimees")   != null) a.setHeuresEstimees(Double.valueOf(body.get("heuresEstimees").toString()));
        if (body.get("heuresPassees")    != null) a.setHeuresPassees(Double.valueOf(body.get("heuresPassees").toString()));
        if (body.get("visible")          != null) a.setVisible((Boolean) body.get("visible"));
        if (body.get("facturable")       != null) a.setFacturable((Boolean) body.get("facturable"));
        // ✅ NOUVEAU — estGlobale
        if (body.get("estGlobale")       != null) a.setEstGlobale((Boolean) body.get("estGlobale"));
        if (body.get("creePar")          != null) a.setCreePar(body.get("creePar").toString());
        if (body.get("statutActiviteId") != null)
            a.setStatutActiviteId(Long.valueOf(body.get("statutActiviteId").toString()));
        if (body.get("dateEcheance") != null)
            a.setDateEcheance(java.time.LocalDate.parse(body.get("dateEcheance").toString()));
        return a;
    }
}