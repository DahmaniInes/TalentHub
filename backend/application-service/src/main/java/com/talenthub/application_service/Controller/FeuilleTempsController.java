package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.FeuilleTempsDTO;
import com.talenthub.application_service.DTO.FeuilleTempsRequest;
import com.talenthub.application_service.Service.FeuilleTempsService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.talenthub.application_service.Service.NotificationService;
import com.talenthub.application_service.Enum.NotificationType;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/feuilles-temps")
public class FeuilleTempsController {

    private final FeuilleTempsService service;
    private final NotificationService notificationService;

    @Autowired
    public FeuilleTempsController(
            FeuilleTempsService service,
            NotificationService notificationService) {
        this.service             = service;
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<FeuilleTempsDTO>> getAll() {
        return ResponseEntity.ok(
                service.getAllFeuillesTemps().stream().map(FeuilleTempsDTO::new).toList());
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
                service.getByUtilisateur(utilisateurId).stream().map(FeuilleTempsDTO::new).toList());
    }

    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<FeuilleTempsDTO>> getByStatut(@PathVariable String statut) {
        return ResponseEntity.ok(
                service.getByStatut(statut).stream().map(FeuilleTempsDTO::new).toList());
    }

    // ✅ Endpoint pour les approbateurs — toutes les feuilles soumises
    @GetMapping("/soumises")
    public ResponseEntity<List<FeuilleTempsDTO>> getSoumises() {
        return ResponseEntity.ok(
                service.getFeuillesSoumises().stream().map(FeuilleTempsDTO::new).toList());
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

    // ✅ Annuler la soumission — repasse en BROUILLON
    @PostMapping("/{id}/annuler-soumission")
    public ResponseEntity<FeuilleTempsDTO> annulerSoumission(@PathVariable Long id) {
        return ResponseEntity.ok(new FeuilleTempsDTO(service.annulerSoumission(id)));
    }

    @PostMapping("/{id}/valider")
    public ResponseEntity<FeuilleTempsDTO> valider(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(new FeuilleTempsDTO(
                service.valider(id, body.get("valideurId"), body.get("commentaire"))));
    }

    @PostMapping("/{id}/rejeter")
    public ResponseEntity<FeuilleTempsDTO> rejeter(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(new FeuilleTempsDTO(
                service.rejeter(id, body.get("valideurId"), body.get("commentaire"))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
    // ✅ Toutes les feuilles pour approbateurs (SOUMISE, VALIDEE, REJETEE)
    @GetMapping("/approbations")
    public ResponseEntity<List<FeuilleTempsDTO>> getPourApprobation() {
        return ResponseEntity.ok(
                service.getPourApprobation().stream().map(FeuilleTempsDTO::new).toList()
        );
    }



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
                nomModificateur + " a modifié votre feuille de temps de la semaine du " + semaineDu + ".",
                "/feuille-temps",
                null
        );

        return ResponseEntity.ok().build();
    }


}