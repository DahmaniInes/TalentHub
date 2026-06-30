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
            @RequestParam(required = false) Long prioriteId,
            @RequestParam(required = false) Boolean globalesUniquement) {

        if (!permCtx.has("ACTIVITY_VIEW_ALL") && !permCtx.has("ACTIVITY_VIEW_LEAD")
                && !permCtx.has("ACTIVITY_VIEW_OWN")
                && !permCtx.has("PROJECT_VIEW_OWN") && !permCtx.has("PROJECT_VIEW_LEAD")
                && !permCtx.has("PROJECT_VIEW_ALL")
                && !permCtx.has("INT_ACT_VIEW_ALL") && !permCtx.has("INT_ACT_VIEW_OWN")) {
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
                && !permCtx.has("PROJECT_VIEW_ALL") && !permCtx.has("PROJECT_DETAILS_VIEW")
                && !permCtx.has("INT_ACT_VIEW_ALL") && !permCtx.has("INT_ACT_VIEW_OWN")
                && !permCtx.has("TS_OWN_CREATE") && !permCtx.has("TS_OWN_UPDATE")
                && !permCtx.has("TS_OWN_READ") && !permCtx.has("TS_GROUP_READ")
                && !permCtx.has("TS_GROUP_UPDATE") && !permCtx.has("TS_ALL_READ")
                && !permCtx.has("TS_ALL_UPDATE")) {
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

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Demande B : vérification serveur de
    // autoriserActivitesGlobales. Retourne la liste des activités globales
    // à proposer pour CE projet (liste vide si le projet ne les autorise
    // pas). Mêmes permissions que getByProjet() — c'est un endpoint de
    // support à la saisie de temps.
    // ════════════════════════════════════════════════════════════
    @GetMapping("/projet/{projetId}/globales-disponibles")
    public ResponseEntity<?> getGlobalesDisponiblesPourProjet(@PathVariable Long projetId) {
        if (!permCtx.has("ACTIVITY_VIEW_ALL") && !permCtx.has("ACTIVITY_VIEW_LEAD")
                && !permCtx.has("ACTIVITY_VIEW_OWN")
                && !permCtx.has("PROJECT_VIEW_OWN") && !permCtx.has("PROJECT_VIEW_LEAD")
                && !permCtx.has("PROJECT_VIEW_ALL") && !permCtx.has("PROJECT_DETAILS_VIEW")
                && !permCtx.has("TS_OWN_CREATE") && !permCtx.has("TS_OWN_UPDATE")
                && !permCtx.has("TS_OWN_READ") && !permCtx.has("TS_GROUP_READ")
                && !permCtx.has("TS_GROUP_UPDATE") && !permCtx.has("TS_ALL_READ")
                && !permCtx.has("TS_ALL_UPDATE")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission requise."));
        }
        try {
            return ResponseEntity.ok(activiteService.getGlobalesDisponiblesPourProjet(projetId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    // ── GET par ID ────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        if (!permCtx.has("ACTIVITY_VIEW_ALL") && !permCtx.has("ACTIVITY_VIEW_LEAD")
                && !permCtx.has("ACTIVITY_VIEW_OWN")
                && !permCtx.has("PROJECT_VIEW_OWN") && !permCtx.has("PROJECT_VIEW_LEAD")
                && !permCtx.has("PROJECT_VIEW_ALL") && !permCtx.has("PROJECT_DETAILS_VIEW")
                && !permCtx.has("INT_ACT_VIEW_ALL") && !permCtx.has("INT_ACT_VIEW_OWN")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission ACTIVITY_VIEW_ALL requise."));
        }
        return ResponseEntity.ok(activiteService.toDTO(activiteService.getById(id)));
    }

    // ── POST créer ────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        if (!permCtx.has("ACTIVITY_CREATE") && !permCtx.has("INT_ACT_CREATE")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission ACTIVITY_CREATE requise."));
        }
        Activité activite    = buildFromBody(body);
        Long utilisateurId   = extractLong(body, "utilisateurId");
        List<Long> groupeIds = extractLongList(body, "groupeIds");
        List<Long> utilisateurIds = extractLongList(body, "utilisateurIds");

        return new ResponseEntity<>(
                activiteService.toDTO(activiteService.create(activite, utilisateurId, groupeIds,utilisateurIds)),
                HttpStatus.CREATED);
    }

    // ── PUT modifier ──────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestBody Map<String, Object> body) {
        if (!permCtx.has("ACTIVITY_EDIT_ALL") && !permCtx.has("ACTIVITY_EDIT_LEAD")
                && !permCtx.has("ACTIVITY_EDIT_OWN") && !permCtx.has("INT_ACT_EDIT")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission ACTIVITY_EDIT_ALL requise."));
        }

        Activité details     = buildFromBody(body);
        Long utilisateurId   = extractLong(body, "utilisateurId");
        List<Long> groupeIds = extractLongList(body, "groupeIds");
        List<Long> utilisateurIds = extractLongList(body, "utilisateurIds");
        return ResponseEntity.ok(
                activiteService.toDTO(activiteService.update(id, details, utilisateurId, groupeIds, utilisateurIds)));
    }

    // ── PATCH statut ──────────────────────────────────────────────
    @PatchMapping("/{id}/statut")
    public ResponseEntity<?> changerStatut(@PathVariable Long id,
                                           @RequestBody Map<String, Object> body) {
        if (!permCtx.has("ACTIVITY_EDIT_ALL") && !permCtx.has("ACTIVITY_EDIT_LEAD")
                && !permCtx.has("ACTIVITY_EDIT_OWN") && !permCtx.has("INT_ACT_EDIT")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission ACTIVITY_EDIT_ALL requise."));
        }
        Long statutId = Long.valueOf(body.get("statutId").toString());
        return ResponseEntity.ok(
                activiteService.toDTO(activiteService.changerStatut(id, statutId)));
    }

    // ── DELETE ────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!permCtx.has("ACTIVITY_DELETE_ALL") && !permCtx.has("INT_ACT_DELETE")) {
            return ResponseEntity.status(403).build();
        }
        activiteService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── DELETE bulk ───────────────────────────────────────────────
    @DeleteMapping("/bulk")
    public ResponseEntity<Void> deleteBulk(@RequestBody List<Long> ids) {
        if (!permCtx.has("ACTIVITY_DELETE_ALL") && !permCtx.has("INT_ACT_DELETE")) {
            return ResponseEntity.status(403).build();
        }
        ids.forEach(activiteService::delete);
        return ResponseEntity.noContent().build();
    }

    // ── Scénario B : duplication idempotente d'activité globale ───
    @PostMapping("/globale/{globaleId}/dupliquer-pour-projet/{projetId}")
    public ResponseEntity<?> obtenirOuDupliquerPourProjet(
            @PathVariable Long globaleId, @PathVariable Long projetId) {
        if (!permCtx.has("TS_OWN_CREATE") && !permCtx.has("TS_OWN_UPDATE")
                && !permCtx.has("TS_ALL_UPDATE") && !permCtx.has("TS_GROUP_UPDATE")
                && !permCtx.has("ACTIVITY_CREATE") && !permCtx.has("INT_ACT_CREATE")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission requise pour assigner une activité."));
        }
        try {
            Activité resultat = activiteService.obtenirOuDupliquerPourProjet(globaleId, projetId);
            return ResponseEntity.ok(activiteService.toDTO(resultat));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
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
        if (body.get("prioriteId") != null)
            a.setPrioriteId(Long.valueOf(body.get("prioriteId").toString()));
        if (body.get("dateEcheance") != null)
            a.setDateEcheance(LocalDate.parse(body.get("dateEcheance").toString()));
        return a;
    }
}