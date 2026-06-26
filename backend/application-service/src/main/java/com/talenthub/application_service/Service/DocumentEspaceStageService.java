// Service/DocumentEspaceStageService.java — NOUVEAU
package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.DocumentEspaceStageDTO;
import com.talenthub.application_service.Entity.Document;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Repository.DocumentRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * ✅ NOUVEAU — Centralise la logique d'accès à la page "Documents" de
 * l'espace stage. Deux niveaux d'accès :
 *
 * VUE LARGE (admin) : l'utilisateur a INT_DOC_VIEW ET (INT_ADMIN_VIEW_ALL_INTERNS
 * ou INT_PROJ_VIEW_ALL) → voit tous les documents de tous les projets de stage
 * (typeProjetId = STAGE_ACADEMIQUE), toutes leurs activités, plus tous les
 * documents généraux (TOUS_STAGE et ADMIN_ONLY).
 *
 * VUE RESTREINTE (stagiaire/superviseur) : l'utilisateur a seulement
 * INT_DOC_VIEW → voit les documents des projets de stage où IL a un accès
 * légitime (en tant que stagiaire assigné OU superviseur d'au moins un
 * stagiaire du projet), plus les documents généraux TOUS_STAGE, plus les
 * documents STAGIAIRE_ID qui le ciblent lui précisément.
 *
 * Le contrôleur (DocumentEspaceStageController) ne fait que vérifier
 * INT_DOC_VIEW puis déléguer entièrement le filtrage ici.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentEspaceStageService {

    // ✅ ID nomenclature confirmé en base pour STAGE_ACADEMIQUE
    private static final Long TYPE_PROJET_STAGE_ID = 4L;

    private final DocumentRepository    documentRepo;
    private final UtilisateurRepository utilisateurRepo;
    private final ProjetService         projetService;

    /**
     * Point d'entrée principal — résout la portée d'accès puis retourne
     * les documents visibles, triés du plus récent au plus ancien.
     *
     * @param utilisateurId       ID de l'utilisateur courant (résolu depuis le JWT)
     * @param accesLarge          true si l'utilisateur a la vue large (admin)
     */
    @Transactional(readOnly = true)
    public List<DocumentEspaceStageDTO> getDocumentsVisibles(Long utilisateurId, boolean accesLarge) {
        List<Document> documents;

        if (accesLarge) {
            documents = getDocumentsVueLarge();
        } else {
            documents = getDocumentsVueRestreinte(utilisateurId);
        }

        return enrichirAvecDestinataires(documents);
    }

    // ════════════════════════════════════════════════════════════
    // VUE LARGE — tous les documents de tous les projets de stage
    // ════════════════════════════════════════════════════════════
    private List<Document> getDocumentsVueLarge() {
        // Tous les documents liés à un projet de type STAGE_ACADEMIQUE
        // (directement, ou via une activité appartenant à ce projet),
        // plus tous les documents généraux non destinés à un stagiaire précis.
        List<Document> documentsProjetsStage = documentRepo.findByProjetTypeProjetId(TYPE_PROJET_STAGE_ID);
        List<Document> documentsActivitesStage = documentRepo.findByActiviteProjetTypeProjetId(TYPE_PROJET_STAGE_ID);
        List<Document> documentsGeneraux = documentRepo.findGenerauxVisiblesPourAdmin();

        return mergerSansDoublons(documentsProjetsStage, documentsActivitesStage, documentsGeneraux);
    }

    // ════════════════════════════════════════════════════════════
    // VUE RESTREINTE — projets où l'utilisateur a un accès légitime
    // ════════════════════════════════════════════════════════════
    private List<Document> getDocumentsVueRestreinte(Long utilisateurId) {
        Set<Long> projetIdsAccessibles = resoudreProjetsAccessibles(utilisateurId);

        if (projetIdsAccessibles.isEmpty()) {
            // Même sans projet accessible, on garde les documents généraux
            // qui le ciblent (TOUS_STAGE + STAGIAIRE_ID pour lui).
            List<Document> generaux = documentRepo.findGenerauxVisiblesPourUtilisateur(utilisateurId);
            return mergerSansDoublons(generaux);
        }

        List<Document> documentsProjets    = documentRepo.findByProjetIdIn(projetIdsAccessibles);
        List<Document> documentsActivites  = documentRepo.findByActiviteProjetIdIn(projetIdsAccessibles);
        List<Document> documentsGeneraux   = documentRepo.findGenerauxVisiblesPourUtilisateur(utilisateurId);

        return mergerSansDoublons(documentsProjets, documentsActivites, documentsGeneraux);
    }

    /**
     * Résout l'ensemble des IDs de projets de stage auxquels l'utilisateur
     * a un accès légitime : soit il y est lui-même stagiaire assigné, soit
     * il encadre au moins un des stagiaires de ce projet.
     *
     * Réutilise les méthodes déjà existantes et éprouvées de ProjetService
     * (getProjetsParStagiaire / getProjetsParSuperviseur), donc aucune
     * nouvelle requête SQL complexe à écrire ici — juste une union des
     * deux ensembles.
     */
    private Set<Long> resoudreProjetsAccessibles(Long utilisateurId) {
        Set<Long> ids = new java.util.HashSet<>();

        try {
            projetService.getProjetsParStagiaire(utilisateurId)
                    .stream().map(Projet::getId).forEach(ids::add);
        } catch (Exception e) {
            log.warn("Impossible de résoudre les projets en tant que stagiaire pour user {}: {}",
                    utilisateurId, e.getMessage());
        }

        try {
            projetService.getProjetsParSuperviseur(utilisateurId)
                    .stream().map(Projet::getId).forEach(ids::add);
        } catch (Exception e) {
            log.warn("Impossible de résoudre les projets en tant que superviseur pour user {}: {}",
                    utilisateurId, e.getMessage());
        }

        return ids;
    }

    /** Fusionne plusieurs listes en dédoublonnant par ID de document. */
    @SafeVarargs
    private List<Document> mergerSansDoublons(List<Document>... listes) {
        Map<Long, Document> parId = new java.util.LinkedHashMap<>();
        for (List<Document> liste : listes) {
            for (Document d : liste) {
                parId.put(d.getId(), d);
            }
        }
        return parId.values().stream()
                .sorted((a, b) -> b.getDateUpload().compareTo(a.getDateUpload()))
                .toList();
    }

    /**
     * Résout en une seule requête groupée le nom complet des destinataires
     * (cas STAGIAIRE_ID), pour éviter un appel utilisateurRepo.findById()
     * par document (N+1).
     */
    private List<DocumentEspaceStageDTO> enrichirAvecDestinataires(List<Document> documents) {
        Set<Long> destinataireIds = documents.stream()
                .map(Document::getDestinataireId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, String> nomsParId = new HashMap<>();
        if (!destinataireIds.isEmpty()) {
            utilisateurRepo.findAllById(destinataireIds)
                    .forEach(u -> nomsParId.put(u.getId(), u.getNomComplet()));
        }

        return documents.stream()
                .map(d -> new DocumentEspaceStageDTO(
                        d,
                        d.getDestinataireId() != null ? nomsParId.get(d.getDestinataireId()) : null))
                .toList();
    }
}