// Controller/PermissionController.java — COMPLET avec @RequiresPermission + PermissionContext
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.PermissionDTO;
import com.talenthub.application_service.Entity.Permission;
import com.talenthub.application_service.Security.RequiresPermission;
import com.talenthub.application_service.Security.PermissionContext;
import com.talenthub.application_service.Service.PermissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/permissions")
public class PermissionController {

    private final PermissionService permissionService;
    private final PermissionContext permCtx;

    public PermissionController(PermissionService permissionService,
                                PermissionContext permCtx) {
        this.permissionService = permissionService;
        this.permCtx           = permCtx;
    }

    // ── Lire toutes — PROFIL_PERM_VIEW ────────────────────────────────────
    @RequiresPermission("PROFIL_PERM_VIEW")
    @GetMapping
    public ResponseEntity<List<PermissionDTO>> getAllPermissions() {
        return ResponseEntity.ok(
                permissionService.getAllPermissions()
                        .stream()
                        .map(PermissionDTO::new)
                        .toList()
        );
    }

    // ── Par ID — PROFIL_PERM_VIEW ─────────────────────────────────────────
    @RequiresPermission("PROFIL_PERM_VIEW")
    @GetMapping("/{id}")
    public ResponseEntity<Permission> getPermissionById(@PathVariable Long id) {
        Optional<Permission> permission = permissionService.getPermissionById(id);
        return permission.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ── Par code — PROFIL_PERM_VIEW ───────────────────────────────────────
    @RequiresPermission("PROFIL_PERM_VIEW")
    @GetMapping("/code/{code}")
    public ResponseEntity<Permission> getPermissionByCode(@PathVariable String code) {
        // placeholder — implémenter findByCode dans PermissionRepository si besoin
        return ResponseEntity.notFound().build();
    }

    // ── Créer — PERMISSION_CREATE ─────────────────────────────────────────
    @RequiresPermission("PERMISSION_CREATE")
    @PostMapping
    public ResponseEntity<Permission> createPermission(
            @Valid @RequestBody Permission permission) {
        Permission created = permissionService.createPermission(permission);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    // ── Modifier — PERMISSION_UPDATE ──────────────────────────────────────
    @RequiresPermission("PERMISSION_UPDATE")
    @PutMapping("/{id}")
    public ResponseEntity<Permission> updatePermission(
            @PathVariable Long id,
            @Valid @RequestBody Permission permissionDetails) {
        Permission updated = permissionService.updatePermission(id, permissionDetails);
        return ResponseEntity.ok(updated);
    }

    // ── Supprimer — PERMISSION_DELETE ─────────────────────────────────────
    @RequiresPermission("PERMISSION_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePermission(@PathVariable Long id) {
        permissionService.deletePermission(id);
        return ResponseEntity.noContent().build();
    }
}