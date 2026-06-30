package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Groupe;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupeDTO {

    private Long id;
    private String nom;
    private String description;
    private String couleur;
    private Long teamLeadId;
    private String teamLeadNom;      // enrichi depuis Utilisateur
    private String teamLeadPrenom;
    private boolean actif;
    private int nombreMembres;
    private List<MembreInfo> membres;
    private LocalDateTime createdAt;

    @Getter @Setter @AllArgsConstructor @NoArgsConstructor
    public static class MembreInfo {
        private Long id;
        private String nom;
        private String prenom;
        private String email;
        private String photoUrl;
        private String poste;
        private String keycloakId;   // ✅ AJOUTÉ

    }

    public GroupeDTO(Groupe g) {
        this.id             = g.getId();
        this.nom            = g.getNom();
        this.description    = g.getDescription();
        this.couleur        = g.getCouleur();
        this.teamLeadId     = g.getTeamLeadId();
        this.actif          = g.isActif();
        this.createdAt      = g.getCreatedAt();
        this.nombreMembres  = g.getMembres() != null ? g.getMembres().size() : 0;

        if (g.getMembres() != null) {
            this.membres = g.getMembres().stream().map(u -> new MembreInfo(
                    u.getId(), u.getNom(), u.getPrenom(), u.getEmail(), u.getPhotoUrl(), u.getPoste(), u.getKeycloakId()

            )).toList();

            // Enrichir teamLead depuis la liste des membres
            if (g.getTeamLeadId() != null) {
                g.getMembres().stream()
                        .filter(u -> u.getId().equals(g.getTeamLeadId()))
                        .findFirst()
                        .ifPresent(u -> {
                            this.teamLeadNom    = u.getNom();
                            this.teamLeadPrenom = u.getPrenom();
                        });
            }
        }
    }
}
