package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.DTO.NomenclatureAcademiqueRequest;
import com.talenthub.nomenclature_service.Entity.Universite;
import com.talenthub.nomenclature_service.Repository.UniversiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class UniversiteService {

    private final UniversiteRepository repository;

    public List<Universite> getAll()      { return repository.findAll(); }
    public List<Universite> getAllActifs() { return repository.findByActifTrue(); }
    public Optional<Universite> getById(Long id) { return repository.findById(id); }

    public Universite create(NomenclatureAcademiqueRequest req) {
        if (repository.existsByCode(req.getCode().toUpperCase()))
            throw new RuntimeException("Code déjà utilisé : " + req.getCode());
        return repository.save(Universite.builder()
                .code(req.getCode().toUpperCase())
                .libelle(req.getLibelle())
                .description(req.getDescription())
                .actif(req.isActif())
                .build());
    }

    // ✅ Création rapide depuis le formulaire user — le texte saisi devient
    //    directement le CODE (déjà en majuscule côté frontend), et le libellé
    //    est aussi rempli avec la même valeur pour rester cohérent.
    public Universite createOrGet(String saisie) {
        String code = saisie.trim().toUpperCase();

        if (repository.existsByCode(code)) {
            return repository.findAll().stream()
                    .filter(u -> u.getCode().equalsIgnoreCase(code))
                    .findFirst().orElseThrow();
        }

        return repository.save(Universite.builder()
                .code(code)
                .libelle(saisie.trim())
                .actif(true)
                .build());
    }

    public Universite update(Long id, NomenclatureAcademiqueRequest req) {
        Universite u = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Université non trouvée : " + id));

        // ✅ Code modifiable — vérifier l'unicité si changé
        if (req.getCode() != null && !req.getCode().isBlank()
                && !req.getCode().equalsIgnoreCase(u.getCode())) {
            String nouveauCode = req.getCode().toUpperCase();
            if (repository.existsByCode(nouveauCode)) {
                throw new RuntimeException("Code déjà utilisé : " + req.getCode());
            }
            u.setCode(nouveauCode);
        }

        u.setLibelle(req.getLibelle());
        u.setDescription(req.getDescription());
        u.setActif(req.isActif());
        return repository.save(u);
    }

    public Universite setActif(Long id, boolean actif) {
        Universite u = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Université non trouvée : " + id));
        u.setActif(actif);
        return repository.save(u);
    }

    public void delete(Long id) { repository.deleteById(id); }
}