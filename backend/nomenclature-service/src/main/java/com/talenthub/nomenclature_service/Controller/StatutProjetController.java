package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.Entity.StatutProjet;
import com.talenthub.nomenclature_service.Repository.StatutProjetRepository;
import com.talenthub.nomenclature_service.Security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/statut-projet")
@RequiredArgsConstructor
public class StatutProjetController {

    private final StatutProjetRepository repo;

    @GetMapping
    public ResponseEntity<List<StatutProjet>> getAll() {
        return ResponseEntity.ok(repo.findAll());
    }

    @GetMapping("/actifs")
    public ResponseEntity<List<StatutProjet>> getActifs() {
        return ResponseEntity.ok(repo.findByActifTrueOrderByOrdreAffichageAsc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StatutProjet> getById(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("PROJECT_STATUS_CREATE")
    @PostMapping
    public ResponseEntity<StatutProjet> create(@RequestBody StatutProjet entity) {
        return new ResponseEntity<>(repo.save(entity), HttpStatus.CREATED);
    }

    @RequiresPermission("PROJECT_STATUS_EDIT")
    @PutMapping("/{id}")
    public ResponseEntity<StatutProjet> update(@PathVariable Long id,
                                               @RequestBody StatutProjet entity) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        entity.setId(id);
        return ResponseEntity.ok(repo.save(entity));
    }

    @RequiresPermission("PROJECT_STATUS_EDIT")
    @PatchMapping("/{id}/activate")
    public ResponseEntity<StatutProjet> activate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setActif(true);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("PROJECT_STATUS_EDIT")
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<StatutProjet> deactivate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setActif(false);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("PROJECT_STATUS_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}