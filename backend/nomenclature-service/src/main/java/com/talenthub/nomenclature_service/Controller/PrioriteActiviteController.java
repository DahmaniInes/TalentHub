package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.DTO.PrioriteActiviteDto;
import com.talenthub.nomenclature_service.DTO.PrioriteActiviteRequest;
import com.talenthub.nomenclature_service.Security.RequiresPermission;
import com.talenthub.nomenclature_service.Service.PrioriteActiviteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller REST — Priorités d'activité
 *
 * Base path : /api/priorites-activite
 *
 * Permissions requises (vérifiées par @RequiresPermission dans le gateway) :
 *   GET    /         → ACT_PRIORITY_VIEW
 *   GET    /actives  → ACT_PRIORITY_VIEW
 *   GET    /{id}     → ACT_PRIORITY_VIEW
 *   POST   /         → ACT_PRIORITY_CREATE
 *   PUT    /{id}     → ACT_PRIORITY_EDIT
 *   PATCH  /{id}/toggle → ACT_PRIORITY_EDIT
 *   DELETE /{id}     → ACT_PRIORITY_DELETE
 *   DELETE /bulk     → ACT_PRIORITY_DELETE
 */
@RestController
@RequestMapping("/priorites-activite")
@RequiredArgsConstructor
public class PrioriteActiviteController {

    private final PrioriteActiviteService service;

    /**
     * GET /api/priorites-activite
     * Retourne toutes les priorités (actives + inactives), triées par ordre.
     * Permission : ACT_PRIORITY_VIEW
     */
    @GetMapping
    @RequiresPermission("ACT_PRIORITY_VIEW")
    public ResponseEntity<List<PrioriteActiviteDto>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    /**
     * GET /api/priorites-activite/actives
     * Retourne uniquement les priorités actives — pour les selects du formulaire activité.
     * Permission : ACT_PRIORITY_VIEW
     */
    @GetMapping("/actives")
    @RequiresPermission("ACT_PRIORITY_VIEW")
    public ResponseEntity<List<PrioriteActiviteDto>> getActives() {
        return ResponseEntity.ok(service.getActives());
    }

    /**
     * GET /api/priorites-activite/{id}
     * Permission : ACT_PRIORITY_VIEW
     */
    @GetMapping("/{id}")
    @RequiresPermission("ACT_PRIORITY_VIEW")
    public ResponseEntity<PrioriteActiviteDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    /**
     * POST /api/priorites-activite
     * Crée une nouvelle priorité.
     * Permission : ACT_PRIORITY_CREATE
     */
    @PostMapping
    @RequiresPermission("ACT_PRIORITY_CREATE")
    public ResponseEntity<PrioriteActiviteDto> create(@Valid @RequestBody PrioriteActiviteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    /**
     * PUT /api/priorites-activite/{id}
     * Modifie libellé, description, couleur, ordre et statut actif.
     * Le code est ignoré (non modifiable après création).
     * Permission : ACT_PRIORITY_EDIT
     */
    @PutMapping("/{id}")
    @RequiresPermission("ACT_PRIORITY_EDIT")
    public ResponseEntity<PrioriteActiviteDto> update(
            @PathVariable Long id,
            @Valid @RequestBody PrioriteActiviteRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    /**
     * PATCH /api/priorites-activite/{id}/toggle
     * Bascule actif/inactif sans envoyer tout le body.
     * Permission : ACT_PRIORITY_EDIT
     */
    @PatchMapping("/{id}/toggle")
    @RequiresPermission("ACT_PRIORITY_EDIT")
    public ResponseEntity<PrioriteActiviteDto> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(service.toggleActif(id));
    }

    /**
     * DELETE /api/priorites-activite/{id}
     * Permission : ACT_PRIORITY_DELETE
     */
    @DeleteMapping("/{id}")
    @RequiresPermission("ACT_PRIORITY_DELETE")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /api/priorites-activite/bulk
     * Suppression en masse depuis la bulk bar.
     * Permission : ACT_PRIORITY_DELETE
     */
    @DeleteMapping("/bulk")
    @RequiresPermission("ACT_PRIORITY_DELETE")
    public ResponseEntity<Void> deleteBulk(@RequestBody List<Long> ids) {
        service.deleteBulk(ids);
        return ResponseEntity.noContent().build();
    }
}