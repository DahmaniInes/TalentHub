package com.talenthub.nomenclature_service.Service;

import com.talenthub.nomenclature_service.DTO.PrioriteActiviteDto;
import com.talenthub.nomenclature_service.DTO.PrioriteActiviteRequest;
import com.talenthub.nomenclature_service.Entity.PrioriteActivite;
import com.talenthub.nomenclature_service.Repository.PrioriteActiviteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service métier pour les priorités d'activité.
 */
@Service
@RequiredArgsConstructor
public class PrioriteActiviteService {

    private final PrioriteActiviteRepository repository;

    // ── Lecture ──────────────────────────────────────────────

    /** Toutes les priorités, triées par ordre. */
    public List<PrioriteActiviteDto> getAll() {
        return repository.findAllByOrderByOrdreAsc()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Priorités actives uniquement — pour les listes déroulantes du frontend
     * quand on assigne une priorité à une activité.
     */
    public List<PrioriteActiviteDto> getActives() {
        return repository.findByActifTrueOrderByOrdreAsc()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /** Cherche par id. */
    public PrioriteActiviteDto getById(Long id) {
        PrioriteActivite entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Priorité d'activité introuvable : " + id));
        return toDto(entity);
    }

    // ── Écriture ─────────────────────────────────────────────

    /** Crée une nouvelle priorité. Le code doit être unique. */
    public PrioriteActiviteDto create(PrioriteActiviteRequest req) {
        if (repository.existsByCode(req.getCode().toUpperCase())) {
            throw new RuntimeException("Ce code de priorité existe déjà : " + req.getCode());
        }
        PrioriteActivite entity = PrioriteActivite.builder()
                .code(req.getCode().toUpperCase())
                .libelle(req.getLibelle())
                .description(req.getDescription())
                .couleur(req.getCouleur())
                .ordre(req.getOrdre())
                .actif(req.isActif())
                .build();
        return toDto(repository.save(entity));
    }

    /**
     * Met à jour une priorité existante.
     * Le code ne peut pas être modifié après création (référence stable).
     */
    public PrioriteActiviteDto update(Long id, PrioriteActiviteRequest req) {
        PrioriteActivite entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Priorité d'activité introuvable : " + id));

        if (req.getCode() != null && !req.getCode().equalsIgnoreCase(entity.getCode())) {
            if (repository.existsByCode(req.getCode().toUpperCase())) {
                throw new RuntimeException("Ce code de priorité existe déjà : " + req.getCode());
            }
            entity.setCode(req.getCode().toUpperCase());
        }
        // Code non modifiable — on ignore la valeur envoyée
        entity.setLibelle(req.getLibelle());
        entity.setDescription(req.getDescription());
        entity.setCouleur(req.getCouleur());
        entity.setOrdre(req.getOrdre());
        entity.setActif(req.isActif());
        return toDto(repository.save(entity));
    }

    /** Active ou désactive une priorité. */
    public PrioriteActiviteDto toggleActif(Long id) {
        PrioriteActivite entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Priorité d'activité introuvable : " + id));
        entity.setActif(!entity.isActif());
        return toDto(repository.save(entity));
    }

    /** Supprime une priorité par id. */
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Priorité d'activité introuvable : " + id);
        }
        repository.deleteById(id);
    }

    /** Suppression en masse. */
    public void deleteBulk(List<Long> ids) {
        repository.deleteAllById(ids);
    }

    // ── Mapping ───────────────────────────────────────────────

    private PrioriteActiviteDto toDto(PrioriteActivite e) {
        return PrioriteActiviteDto.builder()
                .id(e.getId())
                .code(e.getCode())
                .libelle(e.getLibelle())
                .description(e.getDescription())
                .couleur(e.getCouleur())
                .ordre(e.getOrdre())
                .actif(e.isActif())
                .build();
    }
}