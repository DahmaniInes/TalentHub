package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.Collection;
import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByUtilisateurId(Long utilisateurId);

    List<Document> findByProjetId(Long projetId);

    // ✅ NOUVEAU — documents liés à une activité
    List<Document> findByActiviteId(Long activiteId);

    List<Document> findByStageId(Long stageId);

    // Documents actifs d'un projet (statut = ACTIF = 1)
    @Query("SELECT d FROM Document d WHERE d.projet.id = :projetId AND d.statutDocumentId = 1")
    List<Document> findActifsByProjetId(Long projetId);

    // Documents actifs d'une activité
    @Query("SELECT d FROM Document d WHERE d.activite.id = :activiteId AND d.statutDocumentId = 1")
    List<Document> findActifsByActiviteId(Long activiteId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Document d WHERE d.projet.id = :projetId")
    int deleteByProjetId(Long projetId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Document d WHERE d.activite.id = :activiteId")
    int deleteByActiviteId(Long activiteId);

    long countByActiviteId(Long activiteId);

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Pour la page "Documents" de l'espace stage
    // (DocumentEspaceStageService). Statut ACTIF (=1) uniquement —
    // on ne veut jamais montrer un document soft-deleted (statut=3)
    // dans cette page de consultation.
    // ════════════════════════════════════════════════════════════

    /** Documents liés DIRECTEMENT à un projet d'un type de projet donné. */
    @Query("""
        SELECT d FROM Document d
        WHERE d.projet.typeProjetId = :typeProjetId
        AND d.statutDocumentId = 1
    """)
    List<Document> findByProjetTypeProjetId(@Param("typeProjetId") Long typeProjetId);

    /** Documents liés à une ACTIVITÉ dont au moins un projet est du type donné. */
    @Query("""
        SELECT DISTINCT d FROM Document d
        JOIN d.activite a
        JOIN a.projets p
        WHERE p.typeProjetId = :typeProjetId
        AND d.statutDocumentId = 1
    """)
    List<Document> findByActiviteProjetTypeProjetId(@Param("typeProjetId") Long typeProjetId);

    /** Documents liés directement à l'un des projets donnés (vue restreinte). */
    @Query("""
        SELECT d FROM Document d
        WHERE d.projet.id IN :projetIds
        AND d.statutDocumentId = 1
    """)
    List<Document> findByProjetIdIn(@Param("projetIds") Collection<Long> projetIds);

    /** Documents liés à une activité appartenant à l'un des projets donnés (vue restreinte). */
    @Query("""
        SELECT DISTINCT d FROM Document d
        JOIN d.activite a
        JOIN a.projets p
        WHERE p.id IN :projetIds
        AND d.statutDocumentId = 1
    """)
    List<Document> findByActiviteProjetIdIn(@Param("projetIds") Collection<Long> projetIds);

    /**
     * Documents "généraux" (sans projet NI activité liée) visibles pour la
     * vue large (admin) : TOUS_STAGE ou ADMIN_ONLY.
     */
    @Query("""
        SELECT d FROM Document d
        WHERE d.projet IS NULL AND d.activite IS NULL
        AND d.statutDocumentId = 1
        AND d.visiblePour IN ('TOUS_STAGE', 'ADMIN_ONLY')
    """)
    List<Document> findGenerauxVisiblesPourAdmin();

    /**
     * Documents "généraux" (sans projet NI activité liée) visibles pour un
     * utilisateur précis (vue restreinte) : TOUS_STAGE, ou STAGIAIRE_ID
     * ciblant cet utilisateur précisément. ADMIN_ONLY est exclu.
     */
    @Query("""
        SELECT d FROM Document d
        WHERE d.projet IS NULL AND d.activite IS NULL
        AND d.statutDocumentId = 1
        AND (d.visiblePour = 'TOUS_STAGE'
             OR (d.visiblePour = 'STAGIAIRE_ID' AND d.destinataireId = :utilisateurId))
    """)
    List<Document> findGenerauxVisiblesPourUtilisateur(@Param("utilisateurId") Long utilisateurId);
}