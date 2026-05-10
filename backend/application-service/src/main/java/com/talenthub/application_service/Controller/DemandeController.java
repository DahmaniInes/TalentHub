// application-service/.../Controller/DemandeController.java — REMPLACE
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.DemandeDTO;
import com.talenthub.application_service.DTO.DemandeRequest;
import com.talenthub.application_service.Security.PermissionContext;
import com.talenthub.application_service.Security.RequiresPermission;
import com.talenthub.application_service.Service.DemandeService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/demandes")
public class DemandeController {

    private final DemandeService    service;
    private final PermissionContext permCtx;

    public DemandeController(DemandeService service,
                             PermissionContext permCtx) {
        this.service  = service;
        this.permCtx  = permCtx;
    }

    /**
     * GET /demandes
     * - DEMANDE_VIEW_ALL → toutes les demandes
     * - sinon → seulement ses propres demandes (via JWT sub)
     */
    @GetMapping
    public ResponseEntity<List<DemandeDTO>> getAll(
            @AuthenticationPrincipal Jwt jwt) {

        if (permCtx.has("DEMANDE_VIEW_ALL")) {
            return ResponseEntity.ok(
                    service.getAll().stream().map(DemandeDTO::new).toList());
        }

        // Fallback : charger les demandes de l'utilisateur connecté
        String keycloakId = jwt != null ? jwt.getSubject() : null;
        if (keycloakId == null) return ResponseEntity.ok(List.of());

        return ResponseEntity.ok(
                service.getByKeycloakId(keycloakId).stream()
                        .map(DemandeDTO::new).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DemandeDTO> getById(@PathVariable Long id) {
        return service.getById(id)
                .map(d -> ResponseEntity.ok(new DemandeDTO(d)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/utilisateur/{utilisateurId}")
    public ResponseEntity<List<DemandeDTO>> getByUtilisateur(
            @PathVariable Long utilisateurId) {
        return ResponseEntity.ok(
                service.getByUtilisateur(utilisateurId).stream()
                        .map(DemandeDTO::new).toList());
    }

    @RequiresPermission("DEMANDE_CREATE")
    @PostMapping
    public ResponseEntity<DemandeDTO> create(
            @Valid @RequestBody DemandeRequest req) {
        return new ResponseEntity<>(
                new DemandeDTO(service.create(req)), HttpStatus.CREATED);
    }

    /**
     * PUT /demandes/{id}
     * - DEMANDE_UPDATE_ALL → peut modifier n'importe quelle demande
     * - DEMANDE_UPDATE_OWN → peut modifier seulement les siennes
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @Valid @RequestBody DemandeRequest req,
                                    @AuthenticationPrincipal Jwt jwt) {
        if (!permCtx.has("DEMANDE_UPDATE_ALL") && !permCtx.has("DEMANDE_UPDATE_OWN")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission insuffisante pour modifier une demande."));
        }

        // Si OWN seulement : vérifier que la demande appartient à l'utilisateur
        if (!permCtx.has("DEMANDE_UPDATE_ALL") && permCtx.has("DEMANDE_UPDATE_OWN")) {
            boolean isOwner = service.isOwner(id,
                    jwt != null ? jwt.getSubject() : "");
            if (!isOwner) {
                return ResponseEntity.status(403)
                        .body(Map.of("message",
                                "Vous ne pouvez modifier que vos propres demandes."));
            }
        }
        return ResponseEntity.ok(new DemandeDTO(service.update(id, req)));
    }

    /**
     * POST /demandes/{id}/traiter
     * - DEMANDE_APPROVE → peut approuver
     * - DEMANDE_REJECT  → peut rejeter
     * Le statut détermine l'action
     */

    // Dans DemandeController.java — REMPLACE traiter()
    @PostMapping("/{id}/traiter")
    public ResponseEntity<?> traiter(@PathVariable Long id,
                                     @RequestBody Map<String, String> body,
                                     @AuthenticationPrincipal Jwt jwt) {
        if (!permCtx.has("DEMANDE_APPROVE") && !permCtx.has("DEMANDE_REJECT")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Vous n'avez pas la permission de traiter une demande."));
        }

        Long statutId     = Long.parseLong(body.get("statutId"));
        String commentaire = body.get("commentaireRH");
        String statutCode  = body.getOrDefault("statutCode", ""); // ← reçu du frontend
        String traitePar   = jwt != null ? jwt.getSubject() : "";

        return ResponseEntity.ok(
                new DemandeDTO(service.traiter(id, statutId, traitePar, commentaire, statutCode)));
    }
    /**
     * DELETE /demandes/{id}
     * - DEMANDE_DELETE_ALL → peut supprimer n'importe quelle demande
     * - DEMANDE_DELETE_OWN → peut supprimer seulement les siennes
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                    @AuthenticationPrincipal Jwt jwt) {
        if (!permCtx.has("DEMANDE_DELETE_ALL") && !permCtx.has("DEMANDE_DELETE_OWN")) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Permission insuffisante pour supprimer."));
        }

        if (!permCtx.has("DEMANDE_DELETE_ALL") && permCtx.has("DEMANDE_DELETE_OWN")) {
            boolean isOwner = service.isOwner(id,
                    jwt != null ? jwt.getSubject() : "");
            if (!isOwner) {
                return ResponseEntity.status(403)
                        .body(Map.of("message",
                                "Vous ne pouvez supprimer que vos propres demandes."));
            }
        }
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ✅ Export CSV
    @RequiresPermission("DEMANDE_EXPORT")
    @GetMapping("/export/csv")
    public void exportCsv(HttpServletResponse response) throws IOException {
        response.setContentType("text/csv;charset=UTF-8");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"demandes.csv\"");

        PrintWriter writer = response.getWriter();
        writer.println("ID,Sujet,Type,Statut,Date début,Date fin,Nb jours,Créé le");

        service.getAll().forEach(d -> writer.printf(
                "%d,%s,%d,%d,%s,%s,%s,%s%n",
                d.getId(),
                d.getSujet(),
                d.getTypeDemandeId(),
                d.getStatutDemandeId(),
                d.getDateDebut() != null ? d.getDateDebut() : "",
                d.getDateFin()   != null ? d.getDateFin()   : "",
                d.getNbJours()   != null ? d.getNbJours()   : "",
                d.getDateCreation() != null ? d.getDateCreation() : ""
        ));
        writer.flush();
    }
}