package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Groupe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GroupeRepository extends JpaRepository<Groupe, Long> {
    List<Groupe> findByActifTrue();
    Optional<Groupe> findByNomIgnoreCase(String nom);
    boolean existsByNomIgnoreCase(String nom);

    @Query("SELECT g FROM Groupe g LEFT JOIN FETCH g.membres WHERE g.id = :id")
    Optional<Groupe> findByIdWithMembres(@Param("id") Long id);

    @Query("SELECT g FROM Groupe g JOIN g.membres m WHERE m.id = :userId")
    List<Groupe> findGroupesByMembreId(@Param("userId") Long userId);
}