// 4. ProfilPermissionController.java
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ProfilPermissionDTO;
import com.talenthub.application_service.Entity.ProfilPermission;
import com.talenthub.application_service.Service.ProfilPermissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/profil-permissions")
public class ProfilPermissionController {

    private final ProfilPermissionService profilPermissionService;

    public ProfilPermissionController(ProfilPermissionService profilPermissionService) {
        this.profilPermissionService = profilPermissionService;
    }

    @GetMapping
    public ResponseEntity<List<ProfilPermissionDTO>> getAllProfilPermissions() {
        return ResponseEntity.ok(
                profilPermissionService.getAllProfilPermissions()
                        .stream().map(ProfilPermissionDTO::new).toList()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProfilPermission> getProfilPermissionById(@PathVariable Long id) {
        Optional<ProfilPermission> pp = profilPermissionService.getProfilPermissionById(id);
        return pp.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Très utile pour l'affichage des droits d'un profil
    @GetMapping("/profil/{profilId}")
    public ResponseEntity<List<ProfilPermissionDTO>> getPermissionsByProfil(@PathVariable Long profilId) {
        return ResponseEntity.ok(
                profilPermissionService.getPermissionsByProfil(profilId)
                        .stream().map(ProfilPermissionDTO::new).toList()
        );
    }

    @PostMapping
    public ResponseEntity<ProfilPermission> createProfilPermission(
            @Valid @RequestBody ProfilPermission profilPermission) {
        ProfilPermission created = profilPermissionService.createProfilPermission(profilPermission);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProfilPermission> updateProfilPermission(
            @PathVariable Long id,
            @Valid @RequestBody ProfilPermission details) {
        ProfilPermission updated = profilPermissionService.updateProfilPermission(id, details);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProfilPermission(@PathVariable Long id) {
        profilPermissionService.deleteProfilPermission(id);
        return ResponseEntity.noContent().build();
    }
}