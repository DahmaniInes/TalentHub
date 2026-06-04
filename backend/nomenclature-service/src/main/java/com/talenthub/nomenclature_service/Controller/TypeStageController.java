// nomenclature-service/.../Controller/TypeStageController.java
package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.Entity.TypeStage;
import com.talenthub.nomenclature_service.Security.RequiresPermission;
import com.talenthub.nomenclature_service.Service.TypeStageService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/types-stage")
public class TypeStageController {

    private final TypeStageService service;
    public TypeStageController(TypeStageService service) { this.service = service; }

    @GetMapping          public ResponseEntity<List<TypeStage>> getAll()    { return ResponseEntity.ok(service.getAll()); }
    @GetMapping("/actifs") public ResponseEntity<List<TypeStage>> getActifs() { return ResponseEntity.ok(service.getAllActifs()); }
    @GetMapping("/{id}") public ResponseEntity<TypeStage> getById(@PathVariable Long id) {
        return service.getById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequiresPermission("INT_TYPE_CREATE")
    @PostMapping
    public ResponseEntity<TypeStage> create(@RequestBody TypeStage req) {
        return new ResponseEntity<>(service.create(req), HttpStatus.CREATED);
    }

    @RequiresPermission("INT_TYPE_EDIT")
    @PutMapping("/{id}")
    public ResponseEntity<TypeStage> update(@PathVariable Long id, @RequestBody TypeStage req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @RequiresPermission("INT_TYPE_EDIT")
    @PatchMapping("/{id}/activate")
    public ResponseEntity<TypeStage> activate(@PathVariable Long id) {
        return ResponseEntity.ok(service.setActif(id, true));
    }

    @RequiresPermission("INT_TYPE_EDIT")
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<TypeStage> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(service.setActif(id, false));
    }

    @RequiresPermission("INT_TYPE_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}