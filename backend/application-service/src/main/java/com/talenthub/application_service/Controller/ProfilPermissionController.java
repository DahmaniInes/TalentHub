// Controller/ProfilPermissionController.java — REMPLACE le fichier entier
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ProfilPermissionDTO;
import com.talenthub.application_service.Entity.Permission;
import com.talenthub.application_service.Entity.Profil;
import com.talenthub.application_service.Entity.ProfilPermission;
import com.talenthub.application_service.Repository.PermissionRepository;
import com.talenthub.application_service.Repository.ProfilRepository;
import com.talenthub.application_service.Service.ProfilPermissionService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/profil-permissions")
public class ProfilPermissionController {

    private final ProfilPermissionService service;
    private final ProfilRepository        profilRepository;
    private final PermissionRepository    permissionRepository;

    public ProfilPermissionController(ProfilPermissionService service,
                                      ProfilRepository profilRepository,
                                      PermissionRepository permissionRepository) {
        this.service             = service;
        this.profilRepository    = profilRepository;
        this.permissionRepository= permissionRepository;
    }

    @GetMapping
    public ResponseEntity<List<ProfilPermissionDTO>> getAll() {
        return ResponseEntity.ok(
                service.getAllProfilPermissions().stream()
                        .map(ProfilPermissionDTO::new).toList());
    }

    @GetMapping("/profil/{profilId}")
    public ResponseEntity<List<ProfilPermissionDTO>> getByProfil(@PathVariable Long profilId) {
        return ResponseEntity.ok(
                service.getPermissionsByProfil(profilId).stream()
                        .map(ProfilPermissionDTO::new).toList());
    }

    // ✅ Endpoint utilisé par Angular pour charger les codes au démarrage
    @GetMapping("/profil/{profilId}/codes")
    public ResponseEntity<List<String>> getPermissionCodes(@PathVariable Long profilId) {
        List<String> codes = service.getPermissionsByProfil(profilId).stream()
                .map(pp -> pp.getPermission().getCode())
                .toList();
        return ResponseEntity.ok(codes);
    }

    // ✅ Assigner une permission à un profil — body simple { profilId, permissionId }
    @PostMapping
    public ResponseEntity<ProfilPermissionDTO> create(@RequestBody Map<String, Object> body) {
        Long profilId     = Long.valueOf(body.get("profilId").toString());
        Long permissionId = Long.valueOf(body.get("permissionId").toString());

        Profil profil = profilRepository.findById(profilId)
                .orElseThrow(() -> new RuntimeException("Profil non trouvé: " + profilId));
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new RuntimeException("Permission non trouvée: " + permissionId));

        ProfilPermission pp = new ProfilPermission();
        pp.setProfil(profil);
        pp.setPermission(permission);

        return new ResponseEntity<>(new ProfilPermissionDTO(service.createProfilPermission(pp)),
                HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.deleteProfilPermission(id);
        return ResponseEntity.noContent().build();
    }
}