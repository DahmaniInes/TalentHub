// src/main/java/com/talenthub/application_service/Repository/CommentaireRepository.java
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Commentaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface CommentaireRepository extends JpaRepository<Commentaire, Long> {

    @Query("SELECT c FROM Commentaire c LEFT JOIN FETCH c.groupe WHERE c.projet.id = :projetId ORDER BY c.dateCreation DESC")
    List<Commentaire> findByProjetId(@Param("projetId") Long projetId);

    @Query("SELECT c FROM Commentaire c LEFT JOIN FETCH c.groupe WHERE c.activite.id = :activiteId ORDER BY c.dateCreation DESC")
    List<Commentaire> findByActiviteId(@Param("activiteId") Long activiteId);
}