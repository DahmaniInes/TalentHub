// Controller/ActiviteController.java — REMPLACE COMPLET
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ActiviteDTO;
import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Security.PermissionContext;
import com.talenthub.application_service.Security.RequiresPermission;
import com.talenthub.application_service.Service.ActiviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/activites")
@RequiredArgsConstructor
public class ActiviteController {

    private final ActiviteService   activiteService;
    private final PermissionContext permCtx;

    // ── GET liste ─────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Long statutId,
            @RequestParam(required = false) Long utilisateurId,
            // AVANT : @RequestParam(required = false) Integer priorite
            // APRÈS : prioriteId (Long, correspond à priorite_activite.id)
            @RequestParam(required = false) Long prioriteId,
            @RequestParam(required = false) Boolean globalesUniquement) {

        if (!permCtx.has("ACTIVITY_VIEW_ALL") && !permCtx.has("ACTIVITY_VIEW_LEAD")
                && !permCtx.has("ACTIVITY_VIEW_OWN")
                && !permCtx.has("PROJECT_VIEW_OWN") && !permCtx.has("PROJECT_VIEW_LEAD")
                && !permCtx.has("PROJECT_VIEW_ALL")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission ACTIVITY_VIEW_ALL requise."));
        }
        return ResponseEntity.ok(activiteService.getAllFiltered(
                statutId, utilisateurId, prioriteId,
                Boolean.TRUE.equals(globalesUniquement)));
    }

    // ── GET par projet ────────────────────────────────────────────
    @GetMapping("/projet/{projetId}")
    public ResponseEntity<?> getByProjet(@PathVariable Long projetId) {
        if (!permCtx.has("ACTIVITY_VIEW_ALL") && !permCtx.has("ACTIVITY_VIEW_LEAD")
                && !permCtx.has("ACTIVITY_VIEW_OWN")
                && !permCtx.has("PROJECT_VIEW_OWN") && !permCtx.has("PROJECT_VIEW_LEAD")
                && !permCtx.has("PROJECT_VIEW_ALL") && !permCtx.has("PROJECT_DETAILS_VIEW")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission ACTIVITY_VIEW_ALL requise."));
        }
        return ResponseEntity.ok(
                activiteService.getByProjet(projetId).stream()
                        .map(activiteService::toDTO).toList());
    }

    // ── GET globales ──────────────────────────────────────────────
    @GetMapping("/globales")
    public ResponseEntity<?> getGlobales() {
        if (!permCtx.has("ACTIVITY_VIEW_ALL") && !permCtx.has("ACTIVITY_VIEW_LEAD")
                && !permCtx.has("ACTIVITY_VIEW_OWN")
                && !permCtx.has("PROJECT_VIEW_OWN") && !permCtx.has("PROJECT_VIEW_LEAD")
                && !permCtx.has("PROJECT_VIEW_ALL")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission ACTIVITY_VIEW_ALL requise."));
        }
        return ResponseEntity.ok(activiteService.getGlobales());
    }

    // ── GET par ID ────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        if (!permCtx.has("ACTIVITY_VIEW_ALL") && !permCtx.has("ACTIVITY_VIEW_LEAD")
                && !permCtx.has("ACTIVITY_VIEW_OWN")
                && !permCtx.has("PROJECT_VIEW_OWN") && !permCtx.has("PROJECT_VIEW_LEAD")
                && !permCtx.has("PROJECT_VIEW_ALL") && !permCtx.has("PROJECT_DETAILS_VIEW")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission ACTIVITY_VIEW_ALL requise."));
        }
        return ResponseEntity.ok(activiteService.toDTO(activiteService.getById(id)));
    }

    // ── POST créer ────────────────────────────────────────────────
    @RequiresPermission("ACTIVITY_CREATE")
    @PostMapping
    public ResponseEntity<ActiviteDTO> create(@RequestBody Map<String, Object> body) {
        Activité activite    = buildFromBody(body);
        Long utilisateurId   = extractLong(body, "utilisateurId");
        List<Long> groupeIds = extractLongList(body, "groupeIds");
        List<Long> utilisateurIds = extractLongList(body, "utilisateurIds"); // ← AJOUTER

        return new ResponseEntity<>(
                activiteService.toDTO(activiteService.create(activite, utilisateurId, groupeIds,utilisateurIds)),
                HttpStatus.CREATED);
    }

    // ── PUT modifier ──────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestBody Map<String, Object> body) {
        if (!permCtx.has("ACTIVITY_EDIT_ALL") && !permCtx.has("ACTIVITY_EDIT_LEAD")
                && !permCtx.has("ACTIVITY_EDIT_OWN")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission ACTIVITY_EDIT_ALL requise."));
        }

        Activité details     = buildFromBody(body);
        Long utilisateurId   = extractLong(body, "utilisateurId");
        List<Long> groupeIds = extractLongList(body, "groupeIds");
        List<Long> utilisateurIds = extractLongList(body, "utilisateurIds"); // ← NOUVEAU
        return ResponseEntity.ok(
                activiteService.toDTO(activiteService.update(id, details, utilisateurId, groupeIds, utilisateurIds)));
    }

    // ── PATCH statut ──────────────────────────────────────────────
    @PatchMapping("/{id}/statut")
    public ResponseEntity<?> changerStatut(@PathVariable Long id,
                                           @RequestBody Map<String, Object> body) {
        if (!permCtx.has("ACTIVITY_EDIT_ALL") && !permCtx.has("ACTIVITY_EDIT_LEAD")
                && !permCtx.has("ACTIVITY_EDIT_OWN")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission ACTIVITY_EDIT_ALL requise."));
        }
        Long statutId = Long.valueOf(body.get("statutId").toString());
        return ResponseEntity.ok(
                activiteService.toDTO(activiteService.changerStatut(id, statutId)));
    }

    // ── DELETE ────────────────────────────────────────────────────
    @RequiresPermission("ACTIVITY_DELETE_ALL")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        activiteService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── DELETE bulk ───────────────────────────────────────────────
    @RequiresPermission("ACTIVITY_DELETE_ALL")
    @DeleteMapping("/bulk")
    public ResponseEntity<Void> deleteBulk(@RequestBody List<Long> ids) {
        ids.forEach(activiteService::delete);
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ───────────────────────────────────────────────────

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
        if (body.get("heuresEstimees")   != null) a.setHeuresEstimees(Double.valueOf(body.get("heuresEstimees").toString()));
        if (body.get("heuresPassees")    != null) a.setHeuresPassees(Double.valueOf(body.get("heuresPassees").toString()));
        if (body.get("visible")          != null) a.setVisible((Boolean) body.get("visible"));
        if (body.get("facturable")       != null) a.setFacturable((Boolean) body.get("facturable"));
        if (body.get("estGlobale")       != null) a.setEstGlobale((Boolean) body.get("estGlobale"));
        if (body.get("creePar")          != null) a.setCreePar(body.get("creePar").toString());
        if (body.get("statutActiviteId") != null)
            a.setStatutActiviteId(Long.valueOf(body.get("statutActiviteId").toString()));

        // AVANT : if (body.get("priorite") != null) a.setPriorite(Integer.parseInt(...))
        // APRÈS : prioriteId (Long)
        if (body.get("prioriteId") != null)
            a.setPrioriteId(Long.valueOf(body.get("prioriteId").toString()));

        if (body.get("dateEcheance") != null)
            a.setDateEcheance(LocalDate.parse(body.get("dateEcheance").toString()));
        return a;
    }
}