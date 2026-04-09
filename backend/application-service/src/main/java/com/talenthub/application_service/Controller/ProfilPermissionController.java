package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ProfilPermissionDTO;
import com.talenthub.application_service.Entity.Permission;
import com.talenthub.application_service.Entity.Profil;
import com.talenthub.application_service.Entity.ProfilPermission;
import com.talenthub.application_service.Repository.PermissionRepository;
import com.talenthub.application_service.Repository.ProfilRepository;
import com.talenthub.application_service.Service.ProfilPermissionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/profil-permissions")
public class ProfilPermissionController {

    private final ProfilPermissionService profilPermissionService;
    private final ProfilRepository profilRepository;
    private final PermissionRepository permissionRepository;

    public ProfilPermissionController(
            ProfilPermissionService profilPermissionService,
            ProfilRepository profilRepository,
            PermissionRepository permissionRepository) {
        this.profilPermissionService = profilPermissionService;
        this.profilRepository        = profilRepository;
        this.permissionRepository    = permissionRepository;
    }

    @GetMapping
    public ResponseEntity<List<ProfilPermissionDTO>> getAll() {
        return ResponseEntity.ok(
                profilPermissionService.getAllProfilPermissions()
                        .stream().map(ProfilPermissionDTO::new).toList()
        );
    }

    @GetMapping("/profil/{profilId}")
    public ResponseEntity<List<ProfilPermissionDTO>> getByProfil(@PathVariable Long profilId) {
        return ResponseEntity.ok(
                profilPermissionService.getPermissionsByProfil(profilId)
                        .stream().map(ProfilPermissionDTO::new).toList()
        );
    }

    // ✅ POST accepte un DTO simple — plus d'entité directement
    @PostMapping
    public ResponseEntity<ProfilPermissionDTO> create(@RequestBody Map<String, Object> body) {
        Long profilId      = Long.valueOf(body.get("profilId").toString());
        Long permissionId  = Long.valueOf(body.get("permissionId").toString());
        boolean canRead    = body.containsKey("canRead")   ? (Boolean) body.get("canRead")   : true;
        boolean canWrite   = body.containsKey("canWrite")  ? (Boolean) body.get("canWrite")  : false;
        boolean canDelete  = body.containsKey("canDelete") ? (Boolean) body.get("canDelete") : false;
        boolean canExport  = body.containsKey("canExport") ? (Boolean) body.get("canExport") : false;

        Profil profil = profilRepository.findById(profilId)
                .orElseThrow(() -> new RuntimeException("Profil non trouvé: " + profilId));
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new RuntimeException("Permission non trouvée: " + permissionId));

        ProfilPermission pp = new ProfilPermission();
        pp.setProfil(profil);
        pp.setPermission(permission);
        pp.setCanRead(canRead);
        pp.setCanWrite(canWrite);
        pp.setCanDelete(canDelete);
        pp.setCanExport(canExport);

        ProfilPermission created = profilPermissionService.createProfilPermission(pp);
        return new ResponseEntity<>(new ProfilPermissionDTO(created), HttpStatus.CREATED);
    }

    // ✅ PUT accepte aussi un body simple
    @PutMapping("/{id}")
    public ResponseEntity<ProfilPermissionDTO> update(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        ProfilPermission existing = profilPermissionService.getProfilPermissionById(id)
                .orElseThrow(() -> new RuntimeException("ProfilPermission non trouvée: " + id));

        if (body.containsKey("canRead"))   existing.setCanRead((Boolean) body.get("canRead"));
        if (body.containsKey("canWrite"))  existing.setCanWrite((Boolean) body.get("canWrite"));
        if (body.containsKey("canDelete")) existing.setCanDelete((Boolean) body.get("canDelete"));
        if (body.containsKey("canExport")) existing.setCanExport((Boolean) body.get("canExport"));

        ProfilPermission updated = profilPermissionService.createProfilPermission(existing);
        return ResponseEntity.ok(new ProfilPermissionDTO(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        profilPermissionService.deleteProfilPermission(id);
        return ResponseEntity.noContent().build();
    }
}