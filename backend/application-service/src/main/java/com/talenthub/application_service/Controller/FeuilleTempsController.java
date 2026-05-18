// Controller/FeuilleTempsController.java — utilise service.toDTO() pour résoudre les noms
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.FeuilleTempsDTO;
import com.talenthub.application_service.DTO.FeuilleTempsRequest;
import com.talenthub.application_service.Service.FeuilleTempsService;
import com.talenthub.application_service.Service.NotificationService;
import com.talenthub.application_service.Enum.NotificationType;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/feuilles-temps")
public class FeuilleTempsController {

    private final FeuilleTempsService service;
    private final NotificationService notificationService;

    @Autowired
    public FeuilleTempsController(FeuilleTempsService service,
                                  NotificationService notificationService) {
        this.service             = service;
        this.notificationService = notificationService;
    }

    // ── GET tous ─────────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<FeuilleTempsDTO>> getAll() {
        return ResponseEntity.ok(
                service.getAllFeuillesTemps().stream()
                        // ✅ toDTO() résout projetNom + activiteNom depuis les repositories
                        .map(service::toDTO)
                        .toList());
    }

    // ── GET par ID ────────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<FeuilleTempsDTO> getById(@PathVariable Long id) {
        return service.getFeuilleTempsById(id)
                .map(ft -> ResponseEntity.ok(service.toDTO(ft)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ── GET par utilisateur ───────────────────────────────────────────────────
    @GetMapping("/utilisateur/{utilisateurId}")
    public ResponseEntity<List<FeuilleTempsDTO>> getByUtilisateur(
            @PathVariable Long utilisateurId) {
        return ResponseEntity.ok(
                service.getByUtilisateur(utilisateurId).stream()
                        .map(service::toDTO)
                        .toList());
    }

    // ── GET par statut ────────────────────────────────────────────────────────
    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<FeuilleTempsDTO>> getByStatut(@PathVariable String statut) {
        return ResponseEntity.ok(
                service.getByStatut(statut).stream()
                        .map(service::toDTO)
                        .toList());
    }

    // ── GET soumises ──────────────────────────────────────────────────────────
    @GetMapping("/soumises")
    public ResponseEntity<List<FeuilleTempsDTO>> getSoumises() {
        return ResponseEntity.ok(
                service.getFeuillesSoumises().stream()
                        .map(service::toDTO)
                        .toList());
    }

    // ── GET pour approbation ──────────────────────────────────────────────────
    @GetMapping("/approbations")
    public ResponseEntity<List<FeuilleTempsDTO>> getPourApprobation() {
        return ResponseEntity.ok(
                service.getPourApprobation().stream()
                        .map(service::toDTO)
                        .toList());
    }

    // ── POST créer ────────────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<FeuilleTempsDTO> create(@Valid @RequestBody FeuilleTempsRequest req) {
        return new ResponseEntity<>(service.toDTO(service.create(req)), HttpStatus.CREATED);
    }

    // ── PUT modifier ──────────────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<FeuilleTempsDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody FeuilleTempsRequest req) {
        return ResponseEntity.ok(service.toDTO(service.update(id, req)));
    }

    // ── POST soumettre ────────────────────────────────────────────────────────
    @PostMapping("/{id}/soumettre")
    public ResponseEntity<FeuilleTempsDTO> soumettre(@PathVariable Long id) {
        return ResponseEntity.ok(service.toDTO(service.soumettre(id)));
    }

    // ── POST annuler soumission ───────────────────────────────────────────────
    @PostMapping("/{id}/annuler-soumission")
    public ResponseEntity<FeuilleTempsDTO> annulerSoumission(@PathVariable Long id) {
        return ResponseEntity.ok(service.toDTO(service.annulerSoumission(id)));
    }

    // ── POST valider ──────────────────────────────────────────────────────────
    @PostMapping("/{id}/valider")
    public ResponseEntity<FeuilleTempsDTO> valider(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.toDTO(
                service.valider(id, body.get("valideurId"), body.get("commentaire"))));
    }

    // ── POST rejeter ──────────────────────────────────────────────────────────
    @PostMapping("/{id}/rejeter")
    public ResponseEntity<FeuilleTempsDTO> rejeter(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(service.toDTO(
                service.rejeter(id, body.get("valideurId"), body.get("commentaire"))));
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── POST notifier modification ────────────────────────────────────────────
    @PostMapping("/notifier-modification")
    public ResponseEntity<Void> notifierModification(@RequestBody Map<String, String> body) {
        String destinataireKeycloakId = body.get("destinataireKeycloakId");
        String nomModificateur         = body.get("nomModificateur");
        String semaineDu               = body.get("semaineDu");

        if (destinataireKeycloakId == null || destinataireKeycloakId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        notificationService.creer(
                destinataireKeycloakId,
                NotificationType.FEUILLE_MODIFIEE,
                "Feuille de temps modifiée 📝",
                nomModificateur + " a modifié votre feuille de temps de la semaine du "
                        + semaineDu + ".",
                "/feuille-temps",
                null
        );
        return ResponseEntity.ok().build();
    }
}