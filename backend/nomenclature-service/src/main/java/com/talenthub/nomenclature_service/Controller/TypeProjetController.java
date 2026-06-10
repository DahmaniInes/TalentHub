package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.Entity.TypeProjet;
import com.talenthub.nomenclature_service.Repository.TypeProjetRepository;
import com.talenthub.nomenclature_service.Security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/type-projet")
@RequiredArgsConstructor
public class TypeProjetController {

    private final TypeProjetRepository repo;

    @GetMapping
    public ResponseEntity<List<TypeProjet>> getAll() {
        return ResponseEntity.ok(repo.findAll());
    }

    @GetMapping("/actifs")
    public ResponseEntity<List<TypeProjet>> getActifs() {
        return ResponseEntity.ok(repo.findByActifTrue());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TypeProjet> getById(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("PROJECT_TYPE_CREATE")
    @PostMapping
    public ResponseEntity<TypeProjet> create(@RequestBody TypeProjet entity) {
        return new ResponseEntity<>(repo.save(entity), HttpStatus.CREATED);
    }

    @RequiresPermission("PROJECT_TYPE_EDIT")
    @PutMapping("/{id}")
    public ResponseEntity<TypeProjet> update(@PathVariable Long id,
                                             @RequestBody TypeProjet entity) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        entity.setId(id);
        return ResponseEntity.ok(repo.save(entity));
    }

    @RequiresPermission("PROJECT_TYPE_EDIT")
    @PatchMapping("/{id}/activate")
    public ResponseEntity<TypeProjet> activate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setActif(true);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("PROJECT_TYPE_EDIT")
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<TypeProjet> deactivate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setActif(false);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("PROJECT_TYPE_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}