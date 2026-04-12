package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long> {
    List<Client> findByActifTrue();
    List<Client> findByNomContainingIgnoreCase(String nom);
    boolean existsByNomIgnoreCase(String nom);

    @Query("SELECT c FROM Client c LEFT JOIN FETCH c.projets WHERE c.id = :id")
    java.util.Optional<Client> findByIdWithProjets(Long id);
}