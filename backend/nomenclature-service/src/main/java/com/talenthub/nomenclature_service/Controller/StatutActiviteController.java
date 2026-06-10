package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.Entity.StatutActivité;
import com.talenthub.nomenclature_service.Repository.StatutActiviteRepository;
import com.talenthub.nomenclature_service.Security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/statut-activite")
@RequiredArgsConstructor
@Slf4j
public class StatutActiviteController {

    private final StatutActiviteRepository repo;

    @GetMapping
    public ResponseEntity<List<StatutActivité>> getAll() {
        return ResponseEntity.ok(repo.findByActifTrueOrderByOrdre());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StatutActivité> getById(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<StatutActivité> getByCode(@PathVariable String code) {
        return repo.findByCode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("ACT_STATUS_CREATE")
    @PostMapping
    public ResponseEntity<StatutActivité> create(@RequestBody StatutActivité statut) {
        return new ResponseEntity<>(repo.save(statut), HttpStatus.CREATED);
    }

    @RequiresPermission("ACT_STATUS_EDIT")
    @PutMapping("/{id}")
    public ResponseEntity<StatutActivité> update(@PathVariable Long id,
                                                 @RequestBody StatutActivité details) {
        return repo.findById(id).map(s -> {
            s.setCode(details.getCode());
            s.setLibelle(details.getLibelle());
            s.setCouleur(details.getCouleur());
            s.setOrdre(details.getOrdre());
            s.setActif(details.isActif());
            return ResponseEntity.ok(repo.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("ACT_STATUS_EDIT")
    @PatchMapping("/{id}/activate")
    public ResponseEntity<StatutActivité> activate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setActif(true);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("ACT_STATUS_EDIT")
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<StatutActivité> deactivate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setActif(false);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("ACT_STATUS_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}