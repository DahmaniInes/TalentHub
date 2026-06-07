// SpecialiteController.java
package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.DTO.NomenclatureAcademiqueRequest;
import com.talenthub.nomenclature_service.Entity.Specialite;
import com.talenthub.nomenclature_service.Service.SpecialiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/specialites")
@RequiredArgsConstructor
public class SpecialiteController {

    private final SpecialiteService service;

    @GetMapping          public ResponseEntity<List<Specialite>> getAll()    { return ResponseEntity.ok(service.getAll()); }
    @GetMapping("/actifs") public ResponseEntity<List<Specialite>> getActifs() { return ResponseEntity.ok(service.getAllActifs()); }
    @GetMapping("/{id}") public ResponseEntity<Specialite> getById(@PathVariable Long id) {
        return service.getById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Specialite> create(@RequestBody NomenclatureAcademiqueRequest req) {
        return new ResponseEntity<>(service.create(req), HttpStatus.CREATED);
    }

    @PostMapping("/create-or-get")
    public ResponseEntity<Specialite> createOrGet(@RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(service.createOrGet(body.get("libelle")));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Specialite> update(@PathVariable Long id, @RequestBody NomenclatureAcademiqueRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<Specialite> activate(@PathVariable Long id) {
        return ResponseEntity.ok(service.setActif(id, true));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Specialite> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(service.setActif(id, false));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}