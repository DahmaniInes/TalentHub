// UniversiteController.java
package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.DTO.NomenclatureAcademiqueRequest;
import com.talenthub.nomenclature_service.Entity.Universite;
import com.talenthub.nomenclature_service.Service.UniversiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/universites")
@RequiredArgsConstructor
public class UniversiteController {

    private final UniversiteService service;

    @GetMapping          public ResponseEntity<List<Universite>> getAll()    { return ResponseEntity.ok(service.getAll()); }
    @GetMapping("/actifs") public ResponseEntity<List<Universite>> getActifs() { return ResponseEntity.ok(service.getAllActifs()); }
    @GetMapping("/{id}") public ResponseEntity<Universite> getById(@PathVariable Long id) {
        return service.getById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Universite> create(@RequestBody NomenclatureAcademiqueRequest req) {
        return new ResponseEntity<>(service.create(req), HttpStatus.CREATED);
    }

    // Endpoint spécial : créer ou retrouver par libellé (utilisé depuis les formulaires)
    @PostMapping("/create-or-get")
    public ResponseEntity<Universite> createOrGet(@RequestBody java.util.Map<String, String> body) {
        return ResponseEntity.ok(service.createOrGet(body.get("libelle")));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Universite> update(@PathVariable Long id, @RequestBody NomenclatureAcademiqueRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<Universite> activate(@PathVariable Long id) {
        return ResponseEntity.ok(service.setActif(id, true));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<Universite> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(service.setActif(id, false));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}