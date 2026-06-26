// DTO/DocumentEspaceStageDTO.java — NOUVEAU
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Document;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * DTO enrichi pour la page "Documents" de l'espace stage. Contient le
 * contexte nécessaire (nom du projet, nom de l'activité, uploadeur, et
 * éventuellement le nom du destinataire ciblé) pour que le frontend
 * affiche tout sans appel supplémentaire.
 */
@Getter
public class DocumentEspaceStageDTO {

    private final Long   id;
    private final String nom;
    private final String nomFichier;
    private final String cheminFichier;
    private final String typeMime;
    private final Long   tailleFichier;
    private final String description;
    private final LocalDateTime dateUpload;

    // ── Contexte d'appartenance ──
    // Exactement un des trois cas suivants s'applique :
    // 1. projetId rempli, activiteId null → document de projet
    // 2. activiteId rempli (projetId aussi, hérité de l'activité) → document d'activité
    // 3. les deux null → document général (voir visiblePour / categorie = GENERAL)
    private final Long   projetId;
    private final String projetNom;
    private final Long   activiteId;
    private final String activiteNom;

    // ── Portée pour les documents généraux ──
    private final String visiblePour;
    private final Long   destinataireId;
    private final String destinataireNomComplet;

    // ── Uploadeur ──
    private final Long   utilisateurId;
    private final String utilisateurNomComplet;
    private final String utilisateurPhotoUrl;

    /** Catégorie résolue côté backend : "PROJET" | "ACTIVITE" | "GENERAL" */
    private final String categorie;

    /**
     * @param d                       l'entité Document source
     * @param destinataireNomComplet  nom complet du destinataire si
     *                                visiblePour = STAGIAIRE_ID et qu'il a
     *                                été résolu par le service (batch, pour
     *                                éviter le N+1) ; null sinon.
     */
    public DocumentEspaceStageDTO(Document d, String destinataireNomComplet) {
        this.id            = d.getId();
        this.nom           = d.getNom();
        this.nomFichier    = d.getNomFichier();
        this.cheminFichier = d.getCheminFichier();
        this.typeMime      = d.getTypeMime();
        this.tailleFichier = d.getTailleFichier();
        this.description   = d.getDescription();
        this.dateUpload    = d.getDateUpload();

        this.visiblePour            = d.getVisiblePour();
        this.destinataireId         = d.getDestinataireId();
        this.destinataireNomComplet = destinataireNomComplet;

        Long pId = null, aId = null;
        String pNom = null, aNom = null;
        String cat = "GENERAL";

        try {
            if (d.getActivite() != null) {
                aId  = d.getActivite().getId();
                aNom = d.getActivite().getNom();
                cat  = "ACTIVITE";
                // Une activité de stage est toujours liée à un projet — on
                // remonte le premier projet associé pour donner le contexte.
                if (d.getActivite().getProjets() != null && !d.getActivite().getProjets().isEmpty()) {
                    pId  = d.getActivite().getProjets().get(0).getId();
                    pNom = d.getActivite().getProjets().get(0).getNom();
                }
            } else if (d.getProjet() != null) {
                pId  = d.getProjet().getId();
                pNom = d.getProjet().getNom();
                cat  = "PROJET";
            }
        } catch (Exception ignored) {}

        this.projetId    = pId;
        this.projetNom   = pNom;
        this.activiteId  = aId;
        this.activiteNom = aNom;
        this.categorie   = cat;

        Long uId = null;
        String uNom = null, uPhoto = null;
        try {
            if (d.getUtilisateur() != null) {
                uId    = d.getUtilisateur().getId();
                uNom   = d.getUtilisateur().getNomComplet();
                uPhoto = d.getUtilisateur().getPhotoUrl();
            }
        } catch (Exception ignored) {}
        this.utilisateurId         = uId;
        this.utilisateurNomComplet = uNom;
        this.utilisateurPhotoUrl   = uPhoto;
    }

    /** Constructeur simple — pas de destinataire à résoudre. */
    public DocumentEspaceStageDTO(Document d) {
        this(d, null);
    }
}