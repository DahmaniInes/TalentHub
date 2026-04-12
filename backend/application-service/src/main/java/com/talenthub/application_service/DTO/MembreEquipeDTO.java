package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.MembreEquipe;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MembreEquipeDTO {

    private Long id;
    private Long projetId;
    private String projetNom;
    private Long utilisateurId;
    private String utilisateurNom;
    private String utilisateurPrenom;
    private String utilisateurEmail;
    private String utilisateurPhotoUrl;
    private String role;
    private Double quotaHoraire;
    private LocalDateTime dateAjout;
    private boolean actif;

    public MembreEquipeDTO(MembreEquipe m) {
        this.id                  = m.getId();
        this.projetId            = m.getProjet() != null ? m.getProjet().getId() : null;
        this.projetNom           = m.getProjet() != null ? m.getProjet().getNom() : null;
        this.utilisateurId       = m.getUtilisateur() != null ? m.getUtilisateur().getId() : null;
        this.utilisateurNom      = m.getUtilisateur() != null ? m.getUtilisateur().getNom() : null;
        this.utilisateurPrenom   = m.getUtilisateur() != null ? m.getUtilisateur().getPrenom() : null;
        this.utilisateurEmail    = m.getUtilisateur() != null ? m.getUtilisateur().getEmail() : null;
        this.utilisateurPhotoUrl = m.getUtilisateur() != null ? m.getUtilisateur().getPhotoUrl() : null;
        this.role                = m.getRole();
        this.quotaHoraire        = m.getQuotaHoraire();
        this.dateAjout           = m.getDateAjout();
        this.actif               = m.isActif();
    }
}
