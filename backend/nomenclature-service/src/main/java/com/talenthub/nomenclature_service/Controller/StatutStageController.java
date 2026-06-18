package com.talenthub.nomenclature_service.Controller;

import com.talenthub.nomenclature_service.Entity.StatutStage;
import com.talenthub.nomenclature_service.Repository.StatutStageRepository;
import com.talenthub.nomenclature_service.Security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/statut-stage")
@RequiredArgsConstructor
public class StatutStageController {

    private final StatutStageRepository repo;

    @GetMapping
    public ResponseEntity<List<StatutStage>> getAll() {
        return ResponseEntity.ok(repo.findAll());
    }

    @GetMapping("/actifs")
    public ResponseEntity<List<StatutStage>> getActifs() {
        return ResponseEntity.ok(repo.findByActifTrueOrderByOrdreAffichageAsc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StatutStage> getById(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("INT_STATUS_CREATE")
    @PostMapping
    public ResponseEntity<StatutStage> create(@RequestBody StatutStage entity) {
        if (entity.getCode() != null) {
            entity.setCode(entity.getCode().toUpperCase());
        }
        return new ResponseEntity<>(repo.save(entity), HttpStatus.CREATED);
    }

    /**
     * ✅ CORRIGÉ — Au lieu de désérialiser le JSON directement en entité JPA
     * et faire repo.save(entity) (qui peut silencieusement ignorer des champs
     * si Hibernate considère l'entité "non dirty", ou écraser des champs non
     * envoyés par le frontend avec null), on charge l'entité existante depuis
     * la base et on applique les setters explicitement, exactement comme
     * StatutReclamationService.update(). Cela garantit que chaque champ —
     * y compris code — est bien pris en compte par le dirty-checking
     * Hibernate et persisté dans l'UPDATE SQL généré.
     */
    @RequiresPermission("INT_STATUS_EDIT")
    @PutMapping("/{id}")
    public ResponseEntity<StatutStage> update(@PathVariable Long id,
                                              @RequestBody StatutStage details) {
        return repo.findById(id).map(s -> {
            // ✅ Code désormais explicitement réassigné et toujours uppercase
            if (details.getCode() != null && !details.getCode().isBlank()) {
                s.setCode(details.getCode().toUpperCase());
            }
            s.setLibelle(details.getLibelle());
            s.setCouleur(details.getCouleur());
            s.setDescription(details.getDescription());
            s.setOrdreAffichage(details.getOrdreAffichage());
            s.setActif(details.isActif());
            return ResponseEntity.ok(repo.save(s));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("INT_STATUS_EDIT")
    @PatchMapping("/{id}/activate")
    public ResponseEntity<StatutStage> activate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setActif(true);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("INT_STATUS_EDIT")
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<StatutStage> deactivate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setActif(false);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @RequiresPermission("INT_STATUS_DELETE")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}