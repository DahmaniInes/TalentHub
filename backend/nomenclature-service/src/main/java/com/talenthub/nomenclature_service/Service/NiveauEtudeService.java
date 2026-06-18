package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.DTO.NomenclatureAcademiqueRequest;
import com.talenthub.nomenclature_service.Entity.NiveauEtude;
import com.talenthub.nomenclature_service.Repository.NiveauEtudeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class NiveauEtudeService {

    private final NiveauEtudeRepository repository;

    public List<NiveauEtude> getAll()      { return repository.findAll(); }
    public List<NiveauEtude> getAllActifs() { return repository.findByActifTrueOrderByOrdreAffichageAsc(); }
    public Optional<NiveauEtude> getById(Long id) { return repository.findById(id); }

    public NiveauEtude create(NomenclatureAcademiqueRequest req) {
        if (repository.existsByCode(req.getCode().toUpperCase()))
            throw new RuntimeException("Code déjà utilisé : " + req.getCode());
        return repository.save(NiveauEtude.builder()
                .code(req.getCode().toUpperCase())
                .libelle(req.getLibelle())
                .description(req.getDescription())
                .ordreAffichage(req.getOrdreAffichage())
                .actif(req.isActif())
                .build());
    }

    // ✅ Création rapide depuis le formulaire user — le texte saisi devient
    //    directement le CODE (déjà en majuscule côté frontend), même pattern
    //    que UniversiteService.createOrGet() / SpecialiteService.createOrGet().
    public NiveauEtude createOrGet(String saisie) {
        String code = saisie.trim().toUpperCase();

        if (repository.existsByCode(code)) {
            return repository.findAll().stream()
                    .filter(n -> n.getCode().equalsIgnoreCase(code))
                    .findFirst().orElseThrow();
        }

        // Place le nouveau niveau à la fin de l'ordre d'affichage existant
        Integer ordreMax = repository.findAll().stream()
                .map(NiveauEtude::getOrdreAffichage)
                .filter(o -> o != null)
                .max(Integer::compareTo)
                .orElse(0);

        return repository.save(NiveauEtude.builder()
                .code(code)
                .libelle(saisie.trim())
                .ordreAffichage(ordreMax + 1)
                .actif(true)
                .build());
    }

    public NiveauEtude update(Long id, NomenclatureAcademiqueRequest req) {
        NiveauEtude n = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Niveau non trouvé : " + id));

        // ✅ Code maintenant modifiable — vérifier l'unicité si changé
        if (req.getCode() != null && !req.getCode().isBlank()
                && !req.getCode().equalsIgnoreCase(n.getCode())) {
            String nouveauCode = req.getCode().toUpperCase();
            if (repository.existsByCode(nouveauCode)) {
                throw new RuntimeException("Code déjà utilisé : " + req.getCode());
            }
            n.setCode(nouveauCode);
        }

        n.setLibelle(req.getLibelle());
        n.setDescription(req.getDescription());
        n.setOrdreAffichage(req.getOrdreAffichage());
        n.setActif(req.isActif());
        return repository.save(n);
    }

    public NiveauEtude setActif(Long id, boolean actif) {
        NiveauEtude n = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Niveau non trouvé : " + id));
        n.setActif(actif);
        return repository.save(n);
    }

    public void delete(Long id) { repository.deleteById(id); }
}