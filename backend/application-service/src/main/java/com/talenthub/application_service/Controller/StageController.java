package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.StageDTO;
import com.talenthub.application_service.Security.RequiresPermission;
import com.talenthub.application_service.Service.StageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stages")
@RequiredArgsConstructor
public class StageController {

    private final StageService service;

    @GetMapping("/utilisateur/{userId}")
    public ResponseEntity<List<StageDTO>> getByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(service.getByUser(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StageDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @RequiresPermission("INT_ADMIN_VIEW_ALL_INTERNS")
    @PostMapping("/utilisateur/{userId}")
    public ResponseEntity<StageDTO> create(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> body) {
        return new ResponseEntity<>(service.create(userId, body),
                HttpStatus.CREATED);
    }

    @RequiresPermission("INT_ADMIN_VIEW_ALL_INTERNS")
    @PutMapping("/{id}")
    public ResponseEntity<StageDTO> update(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(service.update(id, body));
    }

    @RequiresPermission("INT_ADMIN_VIEW_ALL_INTERNS")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ✅ Terminer = passer au statutStageId = 2 (TERMINE dans nomenclature)
    @RequiresPermission("INT_ADMIN_VIEW_ALL_INTERNS")
    @PatchMapping("/{id}/terminer")
    public ResponseEntity<StageDTO> terminer(@PathVariable Long id) {
        return ResponseEntity.ok(service.changerStatut(id, 2L));
    }

    // ✅ Changer statut via ID nomenclature
    @RequiresPermission("INT_ADMIN_VIEW_ALL_INTERNS")
    @PatchMapping("/{id}/statut")
    public ResponseEntity<StageDTO> changerStatut(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Long statutId = Long.valueOf(body.get("statutStageId").toString());
        return ResponseEntity.ok(service.changerStatut(id, statutId));
    }
}