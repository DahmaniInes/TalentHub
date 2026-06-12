package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.Entity.TypeDocument;
import com.talenthub.nomenclature_service.Repository.TypeDocumentRepository;
import com.talenthub.nomenclature_service.Security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/type-document")
@RequiredArgsConstructor
public class TypeDocumentController {

    private final TypeDocumentRepository repo;

    @GetMapping
    public ResponseEntity<List<TypeDocument>> getAll() {
        return ResponseEntity.ok(repo.findAll());
    }

    @GetMapping("/actifs")
    public ResponseEntity<List<TypeDocument>> getActifs() {
        return ResponseEntity.ok(repo.findByActifTrue());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TypeDocument> getById(@PathVariable Long id) {
        return repo.findById(id).map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("DOC_TYPE_CREATE")
    @PostMapping
    public ResponseEntity<TypeDocument> create(@RequestBody TypeDocument entity) {
        return new ResponseEntity<>(repo.save(entity), HttpStatus.CREATED);
    }

    @RequiresPermission("DOC_TYPE_EDIT")
    @PutMapping("/{id}")
    public ResponseEntity<TypeDocument> update(@PathVariable Long id,
                                               @RequestBody TypeDocument entity) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        entity.setId(id);
        return ResponseEntity.ok(repo.save(entity));
    }

    @RequiresPermission("DOC_TYPE_EDIT")
    @PatchMapping("/{id}/activate")
    public ResponseEntity<TypeDocument> activate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setActif(true);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("DOC_TYPE_EDIT")
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<TypeDocument> deactivate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setActif(false);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("DOC_TYPE_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}