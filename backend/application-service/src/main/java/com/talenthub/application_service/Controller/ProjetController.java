// Controller/ProjetController.java — COMPLET avec PermissionContext (pas jwt.getClaim)
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ProjetDTO;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Security.PermissionContext;
import com.talenthub.application_service.Security.RequiresPermission;
import com.talenthub.application_service.Service.ProjetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/projets")
@RequiredArgsConstructor
public class ProjetController {

    private final ProjetService     projetService;
    private final PermissionContext permCtx;

    // ── GET liste — PROJECT_VIEW_ALL | PROJECT_VIEW_LEAD | PROJECT_VIEW_OWN ──
    @GetMapping
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) Long membreId) {
        if (!permCtx.has("PROJECT_VIEW_ALL") && !permCtx.has("PROJECT_VIEW_LEAD")
                && !permCtx.has("PROJECT_VIEW_OWN") && !permCtx.has("PROJECT_DETAILS_VIEW")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission PROJECT_VIEW_ALL requise."));
        }
        try {
            List<ProjetDTO> list;
            if (clientId  != null) list = projetService.getByClient(clientId).stream().map(ProjetDTO::new).toList();
            else if (statut   != null) list = projetService.getByStatut(statut).stream().map(ProjetDTO::new).toList();
            else if (membreId != null) list = projetService.getByMembre(membreId).stream().map(ProjetDTO::new).toList();
            else                       list = projetService.getAllDTO();
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            log.error("Erreur GET /projets: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ── GET détail — PROJECT_VIEW_ALL | PROJECT_VIEW_LEAD | PROJECT_VIEW_OWN | PROJECT_DETAILS_VIEW ──
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        if (!permCtx.has("PROJECT_VIEW_ALL") && !permCtx.has("PROJECT_VIEW_LEAD")
                && !permCtx.has("PROJECT_VIEW_OWN") && !permCtx.has("PROJECT_DETAILS_VIEW")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission PROJECT_VIEW_ALL requise."));
        }
        try {
            Projet p = projetService.getByIdWithDetails(id);
            return ResponseEntity.ok(projetService.toDTO(p));
        } catch (Exception e) {
            log.error("Erreur GET /projets/{}: {}", id, e.getMessage(), e);
            try {
                return ResponseEntity.ok(new ProjetDTO(projetService.getById(id)));
            } catch (Exception e2) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("message", e2.getMessage()));
            }
        }
    }

    // ── POST créer — PROJECT_CREATE ───────────────────────────────
    @RequiresPermission("PROJECT_CREATE")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        try {
            Projet projet          = buildProjetFromBody(body);
            Long   clientId        = extractLong(body, "clientId");
            List<Long> groupeIds   = extractLongList(body, "groupeIds");
            List<Long> activiteIds = extractLongList(body, "activiteIds");
            Projet saved = projetService.create(projet, clientId, groupeIds, activiteIds);
            try {
                return new ResponseEntity<>(projetService.toDTO(
                        projetService.getByIdWithDetails(saved.getId())), HttpStatus.CREATED);
            } catch (Exception e) {
                return new ResponseEntity<>(new ProjetDTO(saved), HttpStatus.CREATED);
            }
        } catch (Exception e) {
            log.error("Erreur POST /projets: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ── PUT modifier — PROJECT_EDIT_ALL | PROJECT_EDIT_LEAD | PROJECT_EDIT_OWN ──
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestBody Map<String, Object> body) {
        if (!permCtx.has("PROJECT_EDIT_ALL") && !permCtx.has("PROJECT_EDIT_LEAD")
                && !permCtx.has("PROJECT_EDIT_OWN")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission PROJECT_EDIT_ALL requise."));
        }
        try {
            Projet details         = buildProjetFromBody(body);
            Long   clientId        = extractLong(body, "clientId");
            List<Long> groupeIds   = extractLongList(body, "groupeIds");
            List<Long> activiteIds = extractLongList(body, "activiteIds");
            Projet saved = projetService.update(id, details, clientId, groupeIds, activiteIds);
            try {
                return ResponseEntity.ok(projetService.toDTO(
                        projetService.getByIdWithDetails(saved.getId())));
            } catch (Exception e) {
                return ResponseEntity.ok(new ProjetDTO(saved));
            }
        } catch (Exception e) {
            log.error("Erreur PUT /projets/{}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ── DELETE — PROJECT_DELETE_ALL ───────────────────────────────
    @RequiresPermission("PROJECT_DELETE_ALL")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projetService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── DELETE bulk — PROJECT_DELETE_ALL ─────────────────────────
    @RequiresPermission("PROJECT_DELETE_ALL")
    @DeleteMapping("/bulk")
    public ResponseEntity<Void> deleteBulk(@RequestBody List<Long> ids) {
        ids.forEach(projetService::delete);
        return ResponseEntity.noContent().build();
    }

    // ── PATCH assigner activités — PROJECT_EDIT_ALL | PROJECT_EDIT_LEAD ──
    @PatchMapping("/{id}/activites")
    public ResponseEntity<?> assignerActivites(@PathVariable Long id,
                                               @RequestBody List<Long> activiteIds) {
        if (!permCtx.has("PROJECT_EDIT_ALL") && !permCtx.has("PROJECT_EDIT_LEAD")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission PROJECT_EDIT_ALL requise."));
        }
        try {
            Projet saved = projetService.assignerActivites(id, activiteIds);
            return ResponseEntity.ok(projetService.toDTO(
                    projetService.getByIdWithDetails(saved.getId())));
        } catch (Exception e) {
            log.error("Erreur PATCH /projets/{}/activites: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ── Helpers ───────────────────────────────────────────────────
    private Projet buildProjetFromBody(Map<String, Object> body) {
        Projet p = new Projet();
        if (body.get("nom")         != null) p.setNom(body.get("nom").toString());
        if (body.get("description") != null) p.setDescription(body.get("description").toString());
        if (body.get("couleur")     != null) p.setCouleur(body.get("couleur").toString());
        if (body.get("statut")      != null) p.setStatut(body.get("statut").toString());
        if (body.get("typeBudget")  != null) p.setTypeBudget(body.get("typeBudget").toString());
        if (body.get("responsableKeycloakId") != null)
            p.setResponsableKeycloakId(body.get("responsableKeycloakId").toString());
        if (body.get("budgetPrevu") != null)
            p.setBudgetPrevu(Double.valueOf(body.get("budgetPrevu").toString()));
        if (body.get("heuresEstimees") != null)
            p.setHeuresEstimees(Double.valueOf(body.get("heuresEstimees").toString()));
        if (body.get("avancement")  != null)
            p.setAvancement(Integer.parseInt(body.get("avancement").toString()));
        if (body.get("seuilAlerteHoraire") != null)
            p.setSeuilAlerteHoraire(Integer.parseInt(body.get("seuilAlerteHoraire").toString()));
        if (body.get("visible")    != null) p.setVisible((Boolean) body.get("visible"));
        if (body.get("facturable") != null) p.setFacturable((Boolean) body.get("facturable"));
        if (body.get("autoriserActivitesGlobales") != null)
            p.setAutoriserActivitesGlobales((Boolean) body.get("autoriserActivitesGlobales"));
        if (body.get("dateDebut") != null)
            p.setDateDebut(LocalDate.parse(body.get("dateDebut").toString()));
        if (body.get("dateFin") != null)
            p.setDateFin(LocalDate.parse(body.get("dateFin").toString()));
        return p;
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
}