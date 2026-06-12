package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Document;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DocumentDTO {

    private Long   id;
    private Long   utilisateurId;
    private String utilisateurNom;
    private Long   projetId;
    private Long   activiteId;   // ✅ NOUVEAU
    private Long   stageId;

    private Long   typeDocumentId;
    private String typeDocumentLibelle;   // enrichi depuis nomenclature

    private Long   statutDocumentId;      // ✅ ID vers nomenclature
    private String statutDocumentCode;    // enrichi
    private String statutDocumentLibelle; // enrichi

    private String nom;
    private String nomFichier;
    private String cheminFichier;  // URL Cloudinary
    private String typeMime;
    private Long   tailleFichier;
    private int    version;
    private String description;
    private boolean estConfidentiel;
    private LocalDateTime dateUpload;
    private LocalDateTime dateExpiration;

    public DocumentDTO(Document d) {
        this.id             = d.getId();
        this.projetId       = d.getProjet()    != null ? d.getProjet().getId()    : null;
        this.activiteId     = d.getActivite()  != null ? d.getActivite().getId()  : null;
        this.stageId        = d.getStage()     != null ? d.getStage().getId()     : null;
        this.typeDocumentId = d.getTypeDocumentId();
        this.statutDocumentId = d.getStatutDocumentId();
        this.nom            = d.getNom();
        this.nomFichier     = d.getNomFichier();
        this.cheminFichier  = d.getCheminFichier();
        this.typeMime       = d.getTypeMime();
        this.tailleFichier  = d.getTailleFichier();
        this.version        = d.getVersion();
        this.description    = d.getDescription();
        this.estConfidentiel = d.isEstConfidentiel();
        this.dateUpload     = d.getDateUpload();
        this.dateExpiration = d.getDateExpiration();
        try {
            if (d.getUtilisateur() != null) {
                this.utilisateurId  = d.getUtilisateur().getId();
                this.utilisateurNom = d.getUtilisateur().getNomComplet();
            }
        } catch (Exception ignored) {}
    }
}