package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.Entity.StatutDocument;
import com.talenthub.nomenclature_service.Repository.StatutDocumentRepository;
import com.talenthub.nomenclature_service.Security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/statut-document")
@RequiredArgsConstructor
public class StatutDocumentController {

    private final StatutDocumentRepository repo;

    @GetMapping
    public ResponseEntity<List<StatutDocument>> getAll() {
        return ResponseEntity.ok(repo.findAll());
    }

    @GetMapping("/actifs")
    public ResponseEntity<List<StatutDocument>> getActifs() {
        return ResponseEntity.ok(repo.findByActifTrue());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StatutDocument> getById(@PathVariable Long id) {
        return repo.findById(id).map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<StatutDocument> getByCode(@PathVariable String code) {
        return repo.findByCode(code).map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("DOC_STATUS_CREATE")
    @PostMapping
    public ResponseEntity<StatutDocument> create(@RequestBody StatutDocument entity) {
        return new ResponseEntity<>(repo.save(entity), HttpStatus.CREATED);
    }

    @RequiresPermission("DOC_STATUS_EDIT")
    @PutMapping("/{id}")
    public ResponseEntity<StatutDocument> update(@PathVariable Long id,
                                                 @RequestBody StatutDocument entity) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        entity.setId(id);
        return ResponseEntity.ok(repo.save(entity));
    }

    @RequiresPermission("DOC_STATUS_EDIT")
    @PatchMapping("/{id}/activate")
    public ResponseEntity<StatutDocument> activate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setActif(true);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("DOC_STATUS_EDIT")
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<StatutDocument> deactivate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setActif(false);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("DOC_STATUS_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}