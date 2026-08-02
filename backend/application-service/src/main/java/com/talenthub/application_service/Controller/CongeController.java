package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.SoldeCongeDTO;
import com.talenthub.application_service.Security.PermissionContext;
import com.talenthub.application_service.Service.CongeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/conges")
public class CongeController {

    private final CongeService congeService;
    private final PermissionContext permCtx;

    public CongeController(CongeService congeService, PermissionContext permCtx) {
        this.congeService = congeService;
        this.permCtx = permCtx;
    }

    // Pas de garde stricte : chacun peut voir SON propre solde (même logique
    // que GET /utilisateurs/keycloak/{id} — profil personnel). L'admin peut
    // aussi appeler cette route pour n'importe quel utilisateurId depuis la
    // modale de traitement.
    @GetMapping("/solde/{utilisateurId}")
    public ResponseEntity<SoldeCongeDTO> getSolde(@PathVariable Long utilisateurId) {
        return ResponseEntity.ok(congeService.calculerSolde(utilisateurId));
    }

    // Réservé aux personnes qui traitent les demandes (mêmes permissions que
    // l'approbation, pour ne pas dépendre d'une permission dédiée absente
    // de la matrice existante).
    @PutMapping("/report/{utilisateurId}")
    public ResponseEntity<?> setReport(@PathVariable Long utilisateurId,
                                       @RequestBody Map<String, Object> body) {
        if (!permCtx.has("DEMANDE_APPROVE") && !permCtx.has("DEMANDE_REJECT")) {
            return ResponseEntity.status(403).body(Map.of("message", "Permission requise pour gérer le report."));
        }
        int annee = Integer.parseInt(body.get("annee").toString());
        double jours = Double.parseDouble(body.get("joursReport").toString());
        congeService.setReport(utilisateurId, annee, jours);
        return ResponseEntity.noContent().build();
    }
}