package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.PrioriteActivite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository JPA pour PrioriteActivite.
 */
@Repository
public interface PrioriteActiviteRepository extends JpaRepository<PrioriteActivite, Long> {

    /** Vérifie l'unicité du code avant création */
    boolean existsByCode(String code);

    /** Cherche par code (insensible à la casse) */
    Optional<PrioriteActivite> findByCodeIgnoreCase(String code);

    /**
     * Retourne les priorités actives triées par ordre croissant.
     * Utilisé par le frontend pour peupler les listes déroulantes.
     */
    List<PrioriteActivite> findByActifTrueOrderByOrdreAsc();

    /** Toutes les priorités triées par ordre */
    List<PrioriteActivite> findAllByOrderByOrdreAsc();
}