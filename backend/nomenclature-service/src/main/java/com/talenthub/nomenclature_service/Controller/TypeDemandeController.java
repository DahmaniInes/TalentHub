package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.DTO.TypeDemandeDTO;
import com.talenthub.nomenclature_service.DTO.TypeDemandeRequest;
import com.talenthub.nomenclature_service.Service.TypeDemandeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/types-demande")
public class TypeDemandeController {

    private final TypeDemandeService service;

    public TypeDemandeController(TypeDemandeService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<TypeDemandeDTO>> getAll() {
        return ResponseEntity.ok(service.getAll().stream().map(TypeDemandeDTO::new).toList());
    }

    @GetMapping("/actifs")
    public ResponseEntity<List<TypeDemandeDTO>> getActifs() {
        return ResponseEntity.ok(service.getAllActifs().stream().map(TypeDemandeDTO::new).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TypeDemandeDTO> getById(@PathVariable Long id) {
        return service.getById(id)
                .map(t -> ResponseEntity.ok(new TypeDemandeDTO(t)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TypeDemandeDTO> create(@Valid @RequestBody TypeDemandeRequest req) {
        return new ResponseEntity<>(new TypeDemandeDTO(service.create(req)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TypeDemandeDTO> update(@PathVariable Long id,
                                                 @Valid @RequestBody TypeDemandeRequest req) {
        return ResponseEntity.ok(new TypeDemandeDTO(service.update(id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}