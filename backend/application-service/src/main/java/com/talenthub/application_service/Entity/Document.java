package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    // Projet optionnel
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projet_id")
    private Projet projet;

    // ✅ NOUVEAU — Activité optionnelle
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activite_id")
    private Activité activite;

    // Stage optionnel
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stage_id")
    private Stage stage;

    @NotNull
    @Column(name = "type_document_id", nullable = false)
    private Long typeDocumentId;

    // ✅ REMPLACÉ — statut est maintenant un ID vers nomenclature-service
    // Plus de String "ACTIF | ARCHIVE | SUPPRIME" hardcodé
    @Column(name = "statut_document_id", nullable = false)
    @Builder.Default
    private Long statutDocumentId = 1L;  // 1 = ACTIF par défaut

    @NotBlank
    @Column(nullable = false, length = 200)
    private String nom;

    @NotBlank
    @Column(name = "nom_fichier", nullable = false, length = 255)
    private String nomFichier;

    // ✅ cheminFichier est conservé mais nullable — URL Cloudinary stockée ici
    // Cloudinary retourne une secure_url, on la stocke dans ce champ
    @Column(name = "chemin_fichier", length = 500)
    private String cheminFichier;

    @Column(name = "type_mime", length = 100)
    private String typeMime;

    @Column(name = "taille_fichier")
    private Long tailleFichier;

    @Column(name = "version", nullable = false)
    @Builder.Default
    private int version = 1;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "est_confidentiel", nullable = false)
    @Builder.Default
    private boolean estConfidentiel = false;

    @Column(name = "date_upload", nullable = false, updatable = false)
    private LocalDateTime dateUpload;

    @Column(name = "date_expiration")
    private LocalDateTime dateExpiration;

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Portée de visibilité pour les documents "généraux"
    // (sans projet ni activité liée). Résout l'ambiguïté : un document
    // sans lien n'indiquait jusqu'ici à QUI il est destiné, seulement
    // qui l'a uploadé.
    //
    // Valeurs possibles :
    //   TOUS_STAGE   → visible par quiconque a accès à l'espace stage
    //                  (admin, superviseur, stagiaire) avec INT_DOC_VIEW.
    //                  C'est la valeur par défaut.
    //   ADMIN_ONLY   → visible seulement par ceux qui ont la vue large
    //                  (INT_ADMIN_VIEW_ALL_INTERNS ou INT_PROJ_VIEW_ALL).
    //   STAGIAIRE_ID → visible seulement par UN stagiaire précis, dont
    //                  l'ID est dans `destinataireId` (ex: sa convention,
    //                  son attestation personnelle).
    //
    // Pour les documents liés à un projet/activité, ce champ n'est PAS
    // utilisé pour le filtrage — c'est l'appartenance au projet/activité
    // qui détermine la visibilité (voir DocumentEspaceStageService).
    // ════════════════════════════════════════════════════════════
    @Column(name = "visible_pour", length = 20)
    @Builder.Default
    private String visiblePour = "TOUS_STAGE";

    // ✅ NOUVEAU — Utilisateur ciblé si visiblePour = STAGIAIRE_ID.
    // Null dans tous les autres cas.
    @Column(name = "destinataire_id")
    private Long destinataireId;

    @PrePersist
    protected void onCreate() {
        this.dateUpload = LocalDateTime.now();
        if (this.statutDocumentId == null) this.statutDocumentId = 1L;
        if (this.visiblePour == null) this.visiblePour = "TOUS_STAGE";
    }
}