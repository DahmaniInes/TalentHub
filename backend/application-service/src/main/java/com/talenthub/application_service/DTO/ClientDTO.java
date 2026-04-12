// ═══════════════════════════════════════════════════
// ClientDTO.java
// ═══════════════════════════════════════════════════
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Client;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ClientDTO {

    private Long id;
    private String nom;
    private String description;
    private String compte;
    private String idTva;
    private String devise;
    private String couleur;
    // Contact
    private String contact;
    private String courriel;
    private String pageAccueil;
    private String mobile;
    private String telephone;
    private String fax;
    // Finance
    private Double budget;
    private Double quotaHoraire;
    private String typeBudget;
    // Adresse
    private String nomSociete;
    private String codePostal;
    private String ville;
    private String pays;
    private String fuseauHoraire;
    // Flags
    private boolean visible;
    private boolean facturable;
    private boolean actif;
    // Stats
    private int nombreProjets;
    private LocalDateTime createdAt;

    public ClientDTO(Client c) {
        this.id            = c.getId();
        this.nom           = c.getNom();
        this.description   = c.getDescription();
        this.compte        = c.getCompte();
        this.idTva         = c.getIdTva();
        this.devise        = c.getDevise();
        this.couleur       = c.getCouleur();
        this.contact       = c.getContact();
        this.courriel      = c.getCourriel();
        this.pageAccueil   = c.getPageAccueil();
        this.mobile        = c.getMobile();
        this.telephone     = c.getTelephone();
        this.fax           = c.getFax();
        this.budget        = c.getBudget();
        this.quotaHoraire  = c.getQuotaHoraire();
        this.typeBudget    = c.getTypeBudget();
        this.nomSociete    = c.getNomSociete();
        this.codePostal    = c.getCodePostal();
        this.ville         = c.getVille();
        this.pays          = c.getPays();
        this.fuseauHoraire = c.getFuseauHoraire();
        this.visible       = c.isVisible();
        this.facturable    = c.isFacturable();
        this.actif         = c.isActif();
        this.nombreProjets = c.getProjets() != null ? c.getProjets().size() : 0;
        this.createdAt     = c.getCreatedAt();
    }
}
 