package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.DTO.StatutDemandeDTO;
import com.talenthub.nomenclature_service.DTO.StatutDemandeRequest;
import com.talenthub.nomenclature_service.Service.StatutDemandeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/statuts-demande")
public class StatutDemandeController {

    private final StatutDemandeService service;

    public StatutDemandeController(StatutDemandeService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<StatutDemandeDTO>> getAll() {
        return ResponseEntity.ok(service.getAll().stream().map(StatutDemandeDTO::new).toList());
    }

    @GetMapping("/actifs")
    public ResponseEntity<List<StatutDemandeDTO>> getActifs() {
        return ResponseEntity.ok(service.getAllActifs().stream().map(StatutDemandeDTO::new).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StatutDemandeDTO> getById(@PathVariable Long id) {
        return service.getById(id)
                .map(s -> ResponseEntity.ok(new StatutDemandeDTO(s)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<StatutDemandeDTO> create(@Valid @RequestBody StatutDemandeRequest req) {
        return new ResponseEntity<>(new StatutDemandeDTO(service.create(req)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<StatutDemandeDTO> update(@PathVariable Long id,
                                                   @Valid @RequestBody StatutDemandeRequest req) {
        return ResponseEntity.ok(new StatutDemandeDTO(service.update(id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}