package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.FeuilleTempsDTO;
import com.talenthub.application_service.DTO.FeuilleTempsRequest;
import com.talenthub.application_service.Service.FeuilleTempsService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/feuilles-temps")
public class FeuilleTempsController {

    private final FeuilleTempsService service;

    public FeuilleTempsController(FeuilleTempsService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<FeuilleTempsDTO>> getAll() {
        return ResponseEntity.ok(
                service.getAllFeuillesTemps().stream().map(FeuilleTempsDTO::new).toList()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<FeuilleTempsDTO> getById(@PathVariable Long id) {
        return service.getFeuilleTempsById(id)
                .map(ft -> ResponseEntity.ok(new FeuilleTempsDTO(ft)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/utilisateur/{utilisateurId}")
    public ResponseEntity<List<FeuilleTempsDTO>> getByUtilisateur(@PathVariable Long utilisateurId) {
        return ResponseEntity.ok(
                service.getByUtilisateur(utilisateurId).stream().map(FeuilleTempsDTO::new).toList()
        );
    }

    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<FeuilleTempsDTO>> getByStatut(@PathVariable String statut) {
        return ResponseEntity.ok(
                service.getByStatut(statut).stream().map(FeuilleTempsDTO::new).toList()
        );
    }

    @PostMapping
    public ResponseEntity<FeuilleTempsDTO> create(@Valid @RequestBody FeuilleTempsRequest req) {
        return new ResponseEntity<>(new FeuilleTempsDTO(service.create(req)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FeuilleTempsDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody FeuilleTempsRequest req) {
        return ResponseEntity.ok(new FeuilleTempsDTO(service.update(id, req)));
    }

    @PostMapping("/{id}/soumettre")
    public ResponseEntity<FeuilleTempsDTO> soumettre(@PathVariable Long id) {
        return ResponseEntity.ok(new FeuilleTempsDTO(service.soumettre(id)));
    }

    @PostMapping("/{id}/valider")
    public ResponseEntity<FeuilleTempsDTO> valider(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(new FeuilleTempsDTO(
                service.valider(id, body.get("valideurId"), body.get("commentaire"))
        ));
    }

    @PostMapping("/{id}/rejeter")
    public ResponseEntity<FeuilleTempsDTO> rejeter(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(new FeuilleTempsDTO(
                service.rejeter(id, body.get("valideurId"), body.get("commentaire"))
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}