package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.TypeProjet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TypeProjetRepository extends JpaRepository<TypeProjet, Long> {
    List<TypeProjet> findByActifTrue();
}