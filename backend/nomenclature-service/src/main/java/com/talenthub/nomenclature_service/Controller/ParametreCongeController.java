package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.DTO.ParametreCongeDTO;
import com.talenthub.nomenclature_service.DTO.ParametreCongeRequest;
import com.talenthub.nomenclature_service.Service.ParametreCongeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/parametres-conge")
public class ParametreCongeController {

    private final ParametreCongeService service;

    public ParametreCongeController(ParametreCongeService service) {
        this.service = service;
    }

    // Lecture ouverte — nécessaire à tout utilisateur pour calculer son solde
    @GetMapping("/actuel")
    public ResponseEntity<ParametreCongeDTO> getActuel() {
        return ResponseEntity.ok(new ParametreCongeDTO(service.getActuel()));
    }

    // Modification — à garder simple ici ; le contrôle de permission admin
    // est fait côté frontend (canManageParametresConge()) et peut être
    // renforcé plus tard avec @RequiresPermission si ce mécanisme existe
    // aussi dans nomenclature-service.
    @PutMapping
    public ResponseEntity<ParametreCongeDTO> update(@Valid @RequestBody ParametreCongeRequest req) {
        return ResponseEntity.ok(new ParametreCongeDTO(service.update(req)));
    }
}