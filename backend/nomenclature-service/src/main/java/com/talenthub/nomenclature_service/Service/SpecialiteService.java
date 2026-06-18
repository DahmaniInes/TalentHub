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

    // ✅ Création rapide depuis le formulaire user — le texte saisi devient
    //    directement le CODE (déjà en majuscule côté frontend).
    public Specialite createOrGet(String saisie) {
        String code = saisie.trim().toUpperCase();

        if (repository.existsByCode(code)) {
            return repository.findAll().stream()
                    .filter(s -> s.getCode().equalsIgnoreCase(code))
                    .findFirst().orElseThrow();
        }

        return repository.save(Specialite.builder()
                .code(code)
                .libelle(saisie.trim())
                .actif(true)
                .build());
    }

    public Specialite update(Long id, NomenclatureAcademiqueRequest req) {
        Specialite s = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Spécialité non trouvée : " + id));

        // ✅ Code modifiable — vérifier l'unicité si changé
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