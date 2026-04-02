package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.DemandeDTO;
import com.talenthub.application_service.DTO.DemandeRequest;
import com.talenthub.application_service.Service.DemandeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/demandes")
public class DemandeController {

    private final DemandeService service;

    public DemandeController(DemandeService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<DemandeDTO>> getAll() {
        return ResponseEntity.ok(service.getAll().stream().map(DemandeDTO::new).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DemandeDTO> getById(@PathVariable Long id) {
        return service.getById(id)
                .map(d -> ResponseEntity.ok(new DemandeDTO(d)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/utilisateur/{utilisateurId}")
    public ResponseEntity<List<DemandeDTO>> getByUtilisateur(@PathVariable Long utilisateurId) {
        return ResponseEntity.ok(
                service.getByUtilisateur(utilisateurId).stream().map(DemandeDTO::new).toList());
    }

    @PostMapping
    public ResponseEntity<DemandeDTO> create(@Valid @RequestBody DemandeRequest req) {
        return new ResponseEntity<>(new DemandeDTO(service.create(req)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DemandeDTO> update(@PathVariable Long id,
                                             @Valid @RequestBody DemandeRequest req) {
        return ResponseEntity.ok(new DemandeDTO(service.update(id, req)));
    }

    @PostMapping("/{id}/traiter")
    public ResponseEntity<DemandeDTO> traiter(@PathVariable Long id,
                                              @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(new DemandeDTO(service.traiter(
                id,
                Long.parseLong(body.get("statutId")),
                body.get("traitePar"),
                body.get("commentaireRH")
        )));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}