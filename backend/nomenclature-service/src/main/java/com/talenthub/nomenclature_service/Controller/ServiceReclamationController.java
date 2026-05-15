package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.DTO.ServiceReclamationDTO;
import com.talenthub.nomenclature_service.DTO.ServiceReclamationRequest;
import com.talenthub.nomenclature_service.Security.RequiresPermission;
import com.talenthub.nomenclature_service.Service.ServiceReclamationService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

@RestController
@RequestMapping("/services-reclamation")
public class ServiceReclamationController {
    private final ServiceReclamationService service;
    public ServiceReclamationController(ServiceReclamationService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<List<ServiceReclamationDTO>> getAll()  { return ResponseEntity.ok(service.getAll().stream().map(ServiceReclamationDTO::new).toList()); }
    @GetMapping("/actifs") public ResponseEntity<List<ServiceReclamationDTO>> getActifs() { return ResponseEntity.ok(service.getAllActifs().stream().map(ServiceReclamationDTO::new).toList()); }
    @GetMapping("/{id}") public ResponseEntity<ServiceReclamationDTO> getById(@PathVariable Long id) { return service.getById(id).map(s -> ResponseEntity.ok(new ServiceReclamationDTO(s))).orElseGet(() -> ResponseEntity.notFound().build()); }

    @RequiresPermission("RECLAMATION_SERVICE_CREATE")
    @PostMapping
    public ResponseEntity<ServiceReclamationDTO> create(@Valid @RequestBody ServiceReclamationRequest req) { return new ResponseEntity<>(new ServiceReclamationDTO(service.create(req)), HttpStatus.CREATED); }

    @RequiresPermission("RECLAMATION_SERVICE_UPDATE")
    @PutMapping("/{id}") public ResponseEntity<ServiceReclamationDTO> update(@PathVariable Long id, @Valid @RequestBody ServiceReclamationRequest req) { return ResponseEntity.ok(new ServiceReclamationDTO(service.update(id, req))); }

    @RequiresPermission("RECLAMATION_SERVICE_ACTIVATE")
    @PatchMapping("/{id}/activate") public ResponseEntity<ServiceReclamationDTO> activate(@PathVariable Long id) { return ResponseEntity.ok(new ServiceReclamationDTO(service.setActif(id, true))); }

    @RequiresPermission("RECLAMATION_SERVICE_DEACTIVATE")
    @PatchMapping("/{id}/deactivate") public ResponseEntity<ServiceReclamationDTO> deactivate(@PathVariable Long id) { return ResponseEntity.ok(new ServiceReclamationDTO(service.setActif(id, false))); }

    @RequiresPermission("RECLAMATION_SERVICE_DELETE")
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable Long id) { service.delete(id); return ResponseEntity.noContent().build(); }

    @RequiresPermission("RECLAMATION_SERVICE_EXPORT")
    @GetMapping("/export/csv") public void exportCsv(HttpServletResponse response) throws IOException {
        response.setContentType("text/csv;charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"services-reclamation.csv\"");
        PrintWriter w = response.getWriter();
        w.println("ID,Code,Libellé,Description,Actif");
        service.getAll().forEach(s -> w.printf("%d,%s,%s,%s,%s%n", s.getId(), s.getCode(), s.getLibelle(), s.getDescription()!=null?s.getDescription():"", s.isActif()?"Oui":"Non"));
        w.flush();
    }
}