package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.DTO.NomenclatureRequest;
import com.talenthub.nomenclature_service.DTO.StatutFeuilleTempsDTO;
import com.talenthub.nomenclature_service.Service.StatutFeuilleTempsService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/statuts-feuille-temps")
public class StatutFeuilleTempsController {

    private final StatutFeuilleTempsService service;
    public StatutFeuilleTempsController(StatutFeuilleTempsService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<List<StatutFeuilleTempsDTO>> getAll() {
        return ResponseEntity.ok(service.getAll().stream().map(StatutFeuilleTempsDTO::new).toList());
    }

    @GetMapping("/actifs")
    public ResponseEntity<List<StatutFeuilleTempsDTO>> getActifs() {
        return ResponseEntity.ok(service.getAllActifs().stream().map(StatutFeuilleTempsDTO::new).toList());
    }

    @PostMapping
    public ResponseEntity<StatutFeuilleTempsDTO> create(@Valid @RequestBody NomenclatureRequest req) {
        return new ResponseEntity<>(new StatutFeuilleTempsDTO(service.create(req)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<StatutFeuilleTempsDTO> update(@PathVariable Long id,
                                                        @Valid @RequestBody NomenclatureRequest req) {
        return ResponseEntity.ok(new StatutFeuilleTempsDTO(service.update(id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id); return ResponseEntity.noContent().build();
    }
}