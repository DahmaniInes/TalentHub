package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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

    @Modifying
    @Query(value = "DELETE FROM projet_groupes WHERE groupe_id = :groupeId", nativeQuery = true)
    void deleteProjetGroupesByGroupeId(@Param("groupeId") Long groupeId);

    @Modifying
    @Query(value = "DELETE FROM groupe_utilisateurs WHERE groupe_id = :groupeId", nativeQuery = true)
    void deleteGroupeUtilisateursByGroupeId(@Param("groupeId") Long groupeId);

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Tous les coéquipiers d'un utilisateur : tous les membres
    // distincts des groupes auxquels CET utilisateur appartient (lui-même
    // inclus dans le résultat brut — exclu côté service). Sert au dropdown
    // Utilisateur de Ma Semaine pour TS_GROUP_READ/UPDATE.
    // ════════════════════════════════════════════════════════════
    @Query("""
        SELECT DISTINCT m FROM Groupe g
        JOIN g.membres gm
        JOIN g.membres m
        WHERE gm.id = :utilisateurId
        """)
    List<Utilisateur> findCoequipiersDe(@Param("utilisateurId") Long utilisateurId);

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Tous les utilisateurs membres d'AU MOINS UN groupe dans
    // toute l'application (peu importe lequel). Sert au dropdown
    // Utilisateur de Ma Semaine pour TS_ALL_READ/UPDATE.
    // ════════════════════════════════════════════════════════════
    @Query("""
        SELECT DISTINCT m FROM Groupe g
        JOIN g.membres m
        """)
    List<Utilisateur> findTousMembresDeGroupes();
}