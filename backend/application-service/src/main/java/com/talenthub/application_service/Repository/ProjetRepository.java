package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Projet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjetRepository extends JpaRepository<Projet, Long> { }