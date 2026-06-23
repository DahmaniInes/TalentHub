// DTO/SuperviseurStagiaireDTO.java — NOUVEAU
// Réponse minimale pour GET /projets/{id}/superviseurs-stagiaires :
// associe chaque stagiaire (par id) à la liste de ses superviseurs actifs.
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Utilisateur;
import lombok.Getter;

import java.util.List;

@Getter
public class SuperviseurStagiaireDTO {

    private final Long stagiaireId;
    private final List<SuperviseurMin> superviseurs;

    public SuperviseurStagiaireDTO(Long stagiaireId, List<Utilisateur> superviseurs) {
        this.stagiaireId  = stagiaireId;
        this.superviseurs = superviseurs.stream()
                .map(SuperviseurMin::new)
                .toList();
    }

    @Getter
    public static class SuperviseurMin {
        private final Long   id;
        private final String nomComplet;
        private final String email;
        private final String photoUrl;
        private final String poste;

        public SuperviseurMin(Utilisateur u) {
            this.id         = u.getId();
            this.nomComplet = ((u.getPrenom() != null ? u.getPrenom() : "")
                    + " " + (u.getNom() != null ? u.getNom() : "")).trim();
            this.email      = u.getEmail();
            this.photoUrl   = u.getPhotoUrl();
            this.poste      = u.getPoste();
        }
    }
}