// src/main/java/com/talenthub/application_service/Controller/ProjetController.java
package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ProjetDTO;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Service.ProjetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/projets")
@RequiredArgsConstructor
public class ProjetController {

    private final ProjetService projetService;

    // ✅ GET /projets — liste complète avec groupes
    @GetMapping
    public ResponseEntity<List<ProjetDTO>> getAll(
            @RequestParam(required = false) Long clientId,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) Long membreId) {
        try {
            List<ProjetDTO> list;
            if (clientId  != null) list = projetService.getByClient(clientId).stream().map(ProjetDTO::new).toList();
            else if (statut   != null) list = projetService.getByStatut(statut).stream().map(ProjetDTO::new).toList();
            else if (membreId != null) list = projetService.getByMembre(membreId).stream().map(ProjetDTO::new).toList();
            else                       list = projetService.getAllDTO();
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            log.error("Erreur GET /projets: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ✅ GET /projets/{id} — avec groupes chargés (sans MultipleBagFetchException)
    @GetMapping("/{id}")
    public ResponseEntity<ProjetDTO> getById(@PathVariable Long id) {
        try {
            Projet p = projetService.getByIdWithDetails(id);
            return ResponseEntity.ok(projetService.toDTO(p));
        } catch (Exception e) {
            log.error("Erreur GET /projets/{}: {}", id, e.getMessage(), e);
            // ✅ Fallback — charger sans JOIN FETCH si la requête détaillée échoue
            try {
                Projet p = projetService.getById(id);
                return ResponseEntity.ok(new ProjetDTO(p));
            } catch (Exception e2) {
                return ResponseEntity.internalServerError().build();
            }
        }
    }




    @PostMapping
    public ResponseEntity<ProjetDTO> create(@RequestBody Map<String, Object> body) {
        try {
            Projet projet          = buildProjetFromBody(body);
            Long   clientId        = extractLong(body, "clientId");
            List<Long> groupeIds   = extractLongList(body, "groupeIds");
            List<Long> activiteIds = extractLongList(body, "activiteIds"); // ✅ NOUVEAU
            Projet saved = projetService.create(projet, clientId, groupeIds, activiteIds);
            try {
                return new ResponseEntity<>(projetService.toDTO(
                        projetService.getByIdWithDetails(saved.getId())), HttpStatus.CREATED);
            } catch (Exception e) {
                return new ResponseEntity<>(new ProjetDTO(saved), HttpStatus.CREATED);
            }
        } catch (Exception e) {
            log.error("Erreur POST /projets: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }}




    @PutMapping("/{id}")
    public ResponseEntity<ProjetDTO> update(@PathVariable Long id,
                                            @RequestBody Map<String, Object> body) {
        try {
            Projet details         = buildProjetFromBody(body);
            Long   clientId        = extractLong(body, "clientId");
            List<Long> groupeIds   = extractLongList(body, "groupeIds");
            List<Long> activiteIds = extractLongList(body, "activiteIds"); // ✅ NOUVEAU
            Projet saved = projetService.update(id, details, clientId, groupeIds, activiteIds);
            try {
                return ResponseEntity.ok(projetService.toDTO(
                        projetService.getByIdWithDetails(saved.getId())));
            } catch (Exception e) {
                return ResponseEntity.ok(new ProjetDTO(saved));
            }
        } catch (Exception e) {
            log.error("Erreur PUT /projets/{}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projetService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/bulk")
    public ResponseEntity<Void> deleteBulk(@RequestBody List<Long> ids) {
        ids.forEach(projetService::delete);
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ──
    private Projet buildProjetFromBody(Map<String, Object> body) {
        Projet p = new Projet();
        if (body.get("nom")         != null) p.setNom(body.get("nom").toString());
        if (body.get("description") != null) p.setDescription(body.get("description").toString());
        if (body.get("couleur")     != null) p.setCouleur(body.get("couleur").toString());
        if (body.get("statut")      != null) p.setStatut(body.get("statut").toString());
        if (body.get("typeBudget")  != null) p.setTypeBudget(body.get("typeBudget").toString());
        if (body.get("responsableKeycloakId") != null)
            p.setResponsableKeycloakId(body.get("responsableKeycloakId").toString());
        if (body.get("budgetPrevu") != null)
            p.setBudgetPrevu(Double.valueOf(body.get("budgetPrevu").toString()));
        if (body.get("quotaHoraire") != null)
            p.setQuotaHoraire(Double.valueOf(body.get("quotaHoraire").toString()));
        if (body.get("avancement")  != null)
            p.setAvancement(Integer.parseInt(body.get("avancement").toString()));
        if (body.get("seuilAlerteHoraire") != null)
            p.setSeuilAlerteHoraire(Integer.parseInt(body.get("seuilAlerteHoraire").toString()));
        if (body.get("visible")    != null) p.setVisible((Boolean) body.get("visible"));
        if (body.get("facturable") != null) p.setFacturable((Boolean) body.get("facturable"));
        if (body.get("autoriserActivitesGlobales") != null)
            p.setAutoriserActivitesGlobales((Boolean) body.get("autoriserActivitesGlobales"));
        if (body.get("dateDebut") != null)
            p.setDateDebut(LocalDate.parse(body.get("dateDebut").toString()));
        if (body.get("dateFin") != null)
            p.setDateFin(LocalDate.parse(body.get("dateFin").toString()));
        return p;
    }

    private Long extractLong(Map<String, Object> body, String key) {
        return body.containsKey(key) && body.get(key) != null
                ? Long.valueOf(body.get(key).toString()) : null;
    }

    @SuppressWarnings("unchecked")
    private List<Long> extractLongList(Map<String, Object> body, String key) {
        if (!body.containsKey(key) || body.get(key) == null) return null;
        Object raw = body.get(key);
        if (raw instanceof List<?> list)
            return list.stream().map(o -> Long.valueOf(o.toString())).toList();
        return null;
    }


    // ✅ NOUVEAU endpoint — assigner des activités à un projet
    @PatchMapping("/{id}/activites")
    public ResponseEntity<ProjetDTO> assignerActivites(
            @PathVariable Long id,
            @RequestBody List<Long> activiteIds) {
        try {
            Projet saved = projetService.assignerActivites(id, activiteIds);
            return ResponseEntity.ok(projetService.toDTO(
                    projetService.getByIdWithDetails(saved.getId())));
        } catch (Exception e) {
            log.error("Erreur PATCH /projets/{}/activites: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();

        }}

}