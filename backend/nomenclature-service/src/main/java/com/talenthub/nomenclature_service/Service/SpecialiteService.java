package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.DTO.NomenclatureAcademiqueRequest;
import com.talenthub.nomenclature_service.Entity.Specialite;
import com.talenthub.nomenclature_service.Repository.SpecialiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class SpecialiteService {

    private final SpecialiteRepository repository;

    public List<Specialite> getAll()      { return repository.findAll(); }
    public List<Specialite> getAllActifs() { return repository.findByActifTrue(); }
    public Optional<Specialite> getById(Long id) { return repository.findById(id); }

    public Specialite create(NomenclatureAcademiqueRequest req) {
        if (repository.existsByCode(req.getCode().toUpperCase()))
            throw new RuntimeException("Code déjà utilisé : " + req.getCode());
        return repository.save(Specialite.builder()
                .code(req.getCode().toUpperCase())
                .libelle(req.getLibelle())
                .description(req.getDescription())
                .actif(req.isActif())
                .build());
    }

    public Specialite createOrGet(String libelle) {
        if (repository.existsByLibelleIgnoreCase(libelle)) {
            return repository.findAll().stream()
                    .filter(s -> s.getLibelle().equalsIgnoreCase(libelle))
                    .findFirst().orElseThrow();
        }
        String code = libelle.toUpperCase()
                .replaceAll("[^A-Z0-9]", "_")
                .substring(0, Math.min(libelle.length(), 30));
        return repository.save(Specialite.builder()
                .code(code + "_" + System.currentTimeMillis() % 1000)
                .libelle(libelle)
                .actif(true)
                .build());
    }

    public Specialite update(Long id, NomenclatureAcademiqueRequest req) {
        Specialite s = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Spécialité non trouvée : " + id));

        // ✅ Code maintenant modifiable — vérifier l'unicité si changé
        if (req.getCode() != null && !req.getCode().isBlank()
                && !req.getCode().equalsIgnoreCase(s.getCode())) {
            String nouveauCode = req.getCode().toUpperCase();
            if (repository.existsByCode(nouveauCode)) {
                throw new RuntimeException("Code déjà utilisé : " + req.getCode());
            }
            s.setCode(nouveauCode);
        }

        s.setLibelle(req.getLibelle());
        s.setDescription(req.getDescription());
        s.setActif(req.isActif());
        return repository.save(s);
    }

    public Specialite setActif(Long id, boolean actif) {
        Specialite s = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Spécialité non trouvée : " + id));
        s.setActif(actif);
        return repository.save(s);
    }

    public void delete(Long id) { repository.deleteById(id); }
}