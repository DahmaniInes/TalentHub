// Controller/ProfilController.java — COMPLET avec @RequiresPermission + PermissionContext
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ProfilDTO;
import com.talenthub.application_service.Entity.Profil;
import com.talenthub.application_service.Security.RequiresPermission;
import com.talenthub.application_service.Security.PermissionContext;
import com.talenthub.application_service.Service.ProfilService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/profils")
public class ProfilController {

    private final ProfilService     profilService;
    private final PermissionContext permCtx;

    public ProfilController(ProfilService profilService,
                            PermissionContext permCtx) {
        this.profilService = profilService;
        this.permCtx       = permCtx;
    }

    // ── Lire tous — accessible si PROFIL_PERM_VIEW ou USER_CREATE ou USER_VIEW
    //    (la liste de profils est nécessaire pour le formulaire de création user)
    @GetMapping
    public ResponseEntity<?> getAllProfils() {
        if (!permCtx.has("PROFIL_PERM_VIEW")
                && !permCtx.has("USER_CREATE")
                && !permCtx.has("USER_VIEW")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission PROFIL_PERM_VIEW requise."));
        }
        List<ProfilDTO> dtos = profilService.getAllProfils()
                .stream()
                .map(p -> new ProfilDTO(p.getId(), p.getNom(), p.getDescription(), p.isActif()))
                .toList();
        return ResponseEntity.ok(dtos);
    }

    // ── Par ID — PROFIL_PERM_VIEW ou USER_VIEW ────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getProfilById(@PathVariable Long id) {
        if (!permCtx.has("PROFIL_PERM_VIEW") && !permCtx.has("USER_VIEW")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission PROFIL_PERM_VIEW requise."));
        }
        return profilService.getProfilById(id)
                .map(p -> ResponseEntity.ok(
                        new ProfilDTO(p.getId(), p.getNom(), p.getDescription(), p.isActif())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ── Créer un profil — PROFIL_CREATE ───────────────────────────────────
    @RequiresPermission("PROFIL_CREATE")
    @PostMapping
    public ResponseEntity<ProfilDTO> createProfil(@Valid @RequestBody ProfilDTO dto) {
        Profil profil = new Profil();
        profil.setNom(dto.getNom());
        profil.setDescription(dto.getDescription());
        profil.setActif(dto.isActif());
        Profil created = profilService.createProfil(profil);
        return new ResponseEntity<>(
                new ProfilDTO(created.getId(), created.getNom(),
                        created.getDescription(), created.isActif()),
                HttpStatus.CREATED
        );
    }

    // ── Modifier un profil — PROFIL_UPDATE ────────────────────────────────
    @RequiresPermission("PROFIL_UPDATE")
    @PutMapping("/{id}")
    public ResponseEntity<ProfilDTO> updateProfil(
            @PathVariable Long id,
            @Valid @RequestBody ProfilDTO dto) {
        Profil details = new Profil();
        details.setNom(dto.getNom());
        details.setDescription(dto.getDescription());
        details.setActif(dto.isActif());
        Profil updated = profilService.updateProfil(id, details);
        return ResponseEntity.ok(
                new ProfilDTO(updated.getId(), updated.getNom(),
                        updated.getDescription(), updated.isActif())
        );
    }

    // ── Supprimer un profil — PROFIL_DELETE ───────────────────────────────
    @RequiresPermission("PROFIL_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProfil(@PathVariable Long id) {
        profilService.deleteProfil(id);
        return ResponseEntity.noContent().build();
    }
}