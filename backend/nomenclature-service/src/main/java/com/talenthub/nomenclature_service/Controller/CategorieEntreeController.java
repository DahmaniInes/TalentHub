package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.DTO.CategorieEntreeDTO;
import com.talenthub.nomenclature_service.DTO.NomenclatureRequest;
import com.talenthub.nomenclature_service.Service.CategorieEntreeService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/categories-entree")
public class CategorieEntreeController {

    private final CategorieEntreeService service;
    public CategorieEntreeController(CategorieEntreeService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<List<CategorieEntreeDTO>> getAll() {
        return ResponseEntity.ok(service.getAll().stream().map(CategorieEntreeDTO::new).toList());
    }

    @GetMapping("/actifs")
    public ResponseEntity<List<CategorieEntreeDTO>> getActifs() {
        return ResponseEntity.ok(service.getAllActifs().stream().map(CategorieEntreeDTO::new).toList());
    }

    @PostMapping
    public ResponseEntity<CategorieEntreeDTO> create(@Valid @RequestBody NomenclatureRequest req) {
        return new ResponseEntity<>(new CategorieEntreeDTO(service.create(req)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategorieEntreeDTO> update(@PathVariable Long id,
                                                     @Valid @RequestBody NomenclatureRequest req) {
        return ResponseEntity.ok(new CategorieEntreeDTO(service.update(id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id); return ResponseEntity.noContent().build();
    }
}