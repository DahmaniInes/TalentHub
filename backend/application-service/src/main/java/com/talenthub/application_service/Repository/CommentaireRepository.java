// Repository/CommentaireRepository.java — avec méthodes delete par FK
package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Commentaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentaireRepository extends JpaRepository<Commentaire, Long> {

    List<Commentaire> findByProjetId(Long projetId);

    List<Commentaire> findByActiviteId(Long activiteId);

    // ✅ Supprimer tous les commentaires d'un projet avant de supprimer le projet
    @Modifying
    @Query("DELETE FROM Commentaire c WHERE c.projet.id = :projetId")
    int deleteByProjetId(@Param("projetId") Long projetId);

    // ✅ Supprimer tous les commentaires d'une activité avant de supprimer l'activité
    @Modifying
    @Query("DELETE FROM Commentaire c WHERE c.activite.id = :activiteId")
    int deleteByActiviteId(@Param("activiteId") Long activiteId);


    long countByActiviteId(Long activiteId);
}