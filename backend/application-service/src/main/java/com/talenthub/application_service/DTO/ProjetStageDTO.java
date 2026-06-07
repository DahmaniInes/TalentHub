package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.ProjetStage;
import lombok.Getter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
public class ProjetStageDTO {
    private final Long id;
    private final String titre;
    private final String description;
    private final LocalDate dateDebut;
    private final LocalDate dateFin;
    private final Integer avancement;
    private final String statut;
    private final LocalDateTime createdAt;
    private final int nombreActivites;
    private final int activitesTerminees;

    // Stagiaires comme IDs + noms (compatibilité)
    private final List<Long> stagiaireIds;
    private final List<String> stagiaireNoms;

    // Stagiaires comme objets complets (pour le style avatar)
    private final List<StagiaireMinDTO> stagiaires;

    public ProjetStageDTO(ProjetStage p) {
        this.id                = p.getId();
        this.titre             = p.getTitre();
        this.description       = p.getDescription();
        this.dateDebut         = p.getDateDebut();
        this.dateFin           = p.getDateFin();
        this.avancement        = p.getAvancement();
        this.statut            = p.getStatut();
        this.createdAt         = p.getCreatedAt();
        this.nombreActivites   = p.getActivites().size();
        this.activitesTerminees = (int) p.getActivites().stream()
                .filter(a -> "TERMINE".equals(a.getStatut())).count();

        this.stagiaireIds  = p.getStagiaires().stream().map(u -> u.getId()).toList();
        this.stagiaireNoms = p.getStagiaires().stream().map(u -> u.getNomComplet()).toList();
        this.stagiaires    = p.getStagiaires().stream()
                .map(u -> new StagiaireMinDTO(
                        u.getId(),
                        u.getNomComplet(),
                        u.getEmail(),
                        u.getPhotoUrl()
                ))
                .toList();
    }

    @Getter
    public static class StagiaireMinDTO {
        private final Long   id;
        private final String nomComplet;
        private final String email;
        private final String photoUrl;

        public StagiaireMinDTO(Long id, String nomComplet, String email, String photoUrl) {
            this.id         = id;
            this.nomComplet = nomComplet;
            this.email      = email;
            this.photoUrl   = photoUrl;
        }
    }
}