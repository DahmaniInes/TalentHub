package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {
    Optional<Utilisateur> findByKeycloakId(String keycloakId);
    boolean existsByEmail(String email);
}