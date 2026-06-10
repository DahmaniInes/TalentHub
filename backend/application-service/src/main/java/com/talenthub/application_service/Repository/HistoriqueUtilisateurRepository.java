package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.HistoriqueUtilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface HistoriqueUtilisateurRepository
        extends JpaRepository<HistoriqueUtilisateur, Long> {

    // Tout l'historique d'un utilisateur (toutes modifications)
    List<HistoriqueUtilisateur> findByUtilisateurIdOrderByDateDebutDesc(
            Long utilisateurId);

    // Historique d'un champ précis
    List<HistoriqueUtilisateur> findByUtilisateurIdAndChampOrderByDateDebutDesc(
            Long utilisateurId, String champ);

    // Valeur actuelle d'un champ (dateFin IS NULL)
    @Query("""
        SELECT h FROM HistoriqueUtilisateur h
        WHERE h.utilisateur.id = :userId
        AND h.champ = :champ
        AND h.dateFin IS NULL
        ORDER BY h.dateDebut DESC
    """)
    Optional<HistoriqueUtilisateur> findValeurActuelle(
            @Param("userId") Long userId,
            @Param("champ") String champ);

    // Valeur d'un champ à une date précise
    @Query("""
        SELECT h FROM HistoriqueUtilisateur h
        WHERE h.utilisateur.id = :userId
        AND h.champ = :champ
        AND h.dateDebut <= :date
        AND (h.dateFin IS NULL OR h.dateFin >= :date)
        ORDER BY h.dateDebut DESC
    """)
    Optional<HistoriqueUtilisateur> findValeurALaDate(
            @Param("userId") Long userId,
            @Param("champ") String champ,
            @Param("date") LocalDate date);

    // Valeurs d'un champ entre deux dates
    @Query("""
        SELECT h FROM HistoriqueUtilisateur h
        WHERE h.utilisateur.id = :userId
        AND h.champ = :champ
        AND h.dateDebut <= :fin
        AND (h.dateFin IS NULL OR h.dateFin >= :debut)
        ORDER BY h.dateDebut ASC
    """)
    List<HistoriqueUtilisateur> findValeursEntreDates(
            @Param("userId") Long userId,
            @Param("champ") String champ,
            @Param("debut") LocalDate debut,
            @Param("fin") LocalDate fin);

    // Alias pour la compatibilité avec HistoriqueUtilisateurService
    default List<HistoriqueUtilisateur> findByUtilisateurId(Long userId) {
        return findByUtilisateurIdOrderByDateDebutDesc(userId);
    }

    default List<HistoriqueUtilisateur> findByUtilisateurIdAndChamp(
            Long userId, String champ) {
        return findByUtilisateurIdAndChampOrderByDateDebutDesc(userId, champ);
    }

    // Recherche tous les users ayant eu une valeur donnée pour un champ
    @Query("""
        SELECT h FROM HistoriqueUtilisateur h
        WHERE h.champ = :champ
        AND h.nouvelleValeur = :valeur
        AND h.dateDebut <= :fin
        AND (h.dateFin IS NULL OR h.dateFin >= :debut)
    """)
    List<HistoriqueUtilisateur> findParValeurEntreDates(
            @Param("champ") String champ,
            @Param("valeur") String valeur,
            @Param("debut") LocalDate debut,
            @Param("fin") LocalDate fin);
}