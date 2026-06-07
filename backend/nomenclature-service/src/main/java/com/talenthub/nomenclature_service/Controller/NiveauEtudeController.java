// NiveauEtudeController.java
package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.DTO.NomenclatureAcademiqueRequest;
import com.talenthub.nomenclature_service.Entity.NiveauEtude;
import com.talenthub.nomenclature_service.Service.NiveauEtudeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/niveaux-etude")
@RequiredArgsConstructor
public class NiveauEtudeController {

    private final NiveauEtudeService service;

    @GetMapping          public ResponseEntity<List<NiveauEtude>> getAll()    { return ResponseEntity.ok(service.getAll()); }
    @GetMapping("/actifs") public ResponseEntity<List<NiveauEtude>> getActifs() { return ResponseEntity.ok(service.getAllActifs()); }
    @GetMapping("/{id}") public ResponseEntity<NiveauEtude> getById(@PathVariable Long id) {
        return service.getById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<NiveauEtude> create(@RequestBody NomenclatureAcademiqueRequest req) {
        return new ResponseEntity<>(service.create(req), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NiveauEtude> update(@PathVariable Long id, @RequestBody NomenclatureAcademiqueRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<NiveauEtude> activate(@PathVariable Long id) {
        return ResponseEntity.ok(service.setActif(id, true));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<NiveauEtude> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(service.setActif(id, false));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}