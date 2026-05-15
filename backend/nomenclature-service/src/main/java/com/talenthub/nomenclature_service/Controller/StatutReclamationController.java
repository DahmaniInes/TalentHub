package com.talenthub.nomenclature_service.Controller;


import com.talenthub.nomenclature_service.DTO.StatutReclamationDTO;
import com.talenthub.nomenclature_service.DTO.StatutReclamationRequest;
import com.talenthub.nomenclature_service.Security.RequiresPermission;
import com.talenthub.nomenclature_service.Service.StatutReclamationService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
@RestController
@RequestMapping("/statuts-reclamation")
public class StatutReclamationController {

    private final StatutReclamationService service;

    public StatutReclamationController(StatutReclamationService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<StatutReclamationDTO>> getAll() {
        return ResponseEntity.ok(service.getAll().stream().map(StatutReclamationDTO::new).toList());
    }

    @GetMapping("/actifs")
    public ResponseEntity<List<StatutReclamationDTO>> getActifs() {
        return ResponseEntity.ok(service.getAllActifs().stream().map(StatutReclamationDTO::new).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StatutReclamationDTO> getById(@PathVariable Long id) {
        return service.getById(id).map(s -> ResponseEntity.ok(new StatutReclamationDTO(s))).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @RequiresPermission("RECLAMATION_STATUT_CREATE")
    @PostMapping
    public ResponseEntity<StatutReclamationDTO> create(@Valid @RequestBody StatutReclamationRequest req) {
        return new ResponseEntity<>(new StatutReclamationDTO(service.create(req)), HttpStatus.CREATED);
    }

    @RequiresPermission("RECLAMATION_STATUT_UPDATE")
    @PutMapping("/{id}")
    public ResponseEntity<StatutReclamationDTO> update(@PathVariable Long id, @Valid @RequestBody StatutReclamationRequest req) {
        return ResponseEntity.ok(new StatutReclamationDTO(service.update(id, req)));
    }

    @RequiresPermission("RECLAMATION_STATUT_ACTIVATE")
    @PatchMapping("/{id}/activate")
    public ResponseEntity<StatutReclamationDTO> activate(@PathVariable Long id) {
        return ResponseEntity.ok(new StatutReclamationDTO(service.setActif(id, true)));
    }

    @RequiresPermission("RECLAMATION_STATUT_DEACTIVATE")
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<StatutReclamationDTO> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(new StatutReclamationDTO(service.setActif(id, false)));
    }

    @RequiresPermission("RECLAMATION_STATUT_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id); return ResponseEntity.noContent().build();
    }

    @RequiresPermission("RECLAMATION_STATUT_EXPORT")
    @GetMapping("/export/csv")
    public void exportCsv(HttpServletResponse response) throws IOException {
        response.setContentType("text/csv;charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"statuts-reclamation.csv\"");
        PrintWriter w = response.getWriter();
        w.println("ID,Code,Libellé,Description,Actif");
        service.getAll().forEach(s -> w.printf("%d,%s,%s,%s,%s%n",
                s.getId(), s.getCode(), s.getLibelle(),
                s.getDescription() != null ? s.getDescription() : "",
                s.isActif() ? "Oui" : "Non"));
        w.flush();
    }
}
