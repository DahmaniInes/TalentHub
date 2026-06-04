package com.talenthub.nomenclature_service.Repository;

import com.talenthub.nomenclature_service.Entity.TypeStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TypeStageRepository extends JpaRepository<TypeStage, Long> {

    List<TypeStage> findByActifTrue();

    boolean existsByCode(String code);

    Optional<TypeStage> findByCode(String code);
}