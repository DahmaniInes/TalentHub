// DTO/FeuilleTempsDTO.java — CORRIGÉ (pas d'erreurs double/int)
package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.FeuilleTemps;
import com.talenthub.application_service.Entity.LigneFeuilleTemps;
import com.talenthub.application_service.Repository.ActiviteRepository;
import com.talenthub.application_service.Repository.ClientRepository;
import com.talenthub.application_service.Repository.ProjetRepository;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Getter
public class FeuilleTempsDTO {

    private final Long          id;
    private final Long          utilisateurId;
    private final String        utilisateurNom;
    private final String        utilisateurPhoto;
    private final LocalDate     semaineDu;
    private final LocalDate     semaineAu;

    // ✅ double — correspond aux champs de l'entité FeuilleTemps
    private final double        heuresTravaillees;
    private final double        heuresSupplementaires;
    private final double heuresAbsence;  // ✅ int — correspond à l'entité

    private final String        statut;
    private final String        commentaireEmploye;
    private final String        commentaireValideur;
    private final String        validePar;
    private final LocalDateTime dateValidation;

    private final List<LigneFeuilleTempsDTO> lignes;

    // ── Constructeur sans résolution ──
    public FeuilleTempsDTO(FeuilleTemps ft) {
        this(ft, null, null, null);
    }

    // ✅ Constructeur enrichi avec résolution noms
    public FeuilleTempsDTO(FeuilleTemps ft,
                           ProjetRepository projetRepo,
                           ActiviteRepository activiteRepo,
                           ClientRepository clientRepo) {
        this.id                    = ft.getId();
        this.utilisateurId         = ft.getUtilisateur() != null ? ft.getUtilisateur().getId() : null;
        this.utilisateurNom        = ft.getUtilisateur() != null ? ft.getUtilisateur().getNomComplet() : null;
        this.utilisateurPhoto      = ft.getUtilisateur() != null ? ft.getUtilisateur().getPhotoUrl() : null;
        this.semaineDu             = ft.getSemaineDu();
        this.semaineAu             = ft.getSemaineAu();
        // ✅ double directement — pas de cast problématique
        this.heuresTravaillees     = ft.getHeuresTravaillees();
        this.heuresSupplementaires = ft.getHeuresSupplementaires();
        this.heuresAbsence         = ft.getHeuresAbsence();
        this.statut                = ft.getStatut();
        this.commentaireEmploye    = ft.getCommentaireEmploye();
        this.commentaireValideur   = ft.getCommentaireValideur();
        this.validePar             = ft.getValidePar();
        this.dateValidation        = ft.getDateValidation();
        this.lignes                = buildLignes(ft.getLignes(), projetRepo, activiteRepo, clientRepo);
    }

    // ── Résolution en batch (un seul appel BD par type) ───────────────────────
    private List<LigneFeuilleTempsDTO> buildLignes(
            List<LigneFeuilleTemps> lignes,
            ProjetRepository    projetRepo,
            ActiviteRepository  activiteRepo,
            ClientRepository    clientRepo) {

        if (lignes == null || lignes.isEmpty()) return List.of();

        // ── Collecter les IDs uniques ──
        Set<Long> projetIds   = lignes.stream().map(LigneFeuilleTemps::getProjetId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> activiteIds = lignes.stream().map(LigneFeuilleTemps::getActiviteId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> clientIds   = lignes.stream().map(LigneFeuilleTemps::getClientId)
                .filter(Objects::nonNull).collect(Collectors.toSet());

        // ── Résoudre en batch (1 requête par type) ──
        Map<Long, String> projetsNoms   = resolveNoms(projetRepo,   projetIds);
        Map<Long, String> activitesNoms = resolveNoms(activiteRepo, activiteIds);
        Map<Long, String> clientsNoms   = resolveNoms(clientRepo,   clientIds);

        return lignes.stream()
                .map(l -> new LigneFeuilleTempsDTO(
                        l,
                        l.getProjetId()   != null ? projetsNoms.get(l.getProjetId())   : null,
                        l.getActiviteId() != null ? activitesNoms.get(l.getActiviteId()) : null,
                        l.getClientId()   != null ? clientsNoms.get(l.getClientId())   : null
                ))
                .toList();
    }

    // ── Helper générique : ID → Nom via findAllById ───────────────────────────
    @SuppressWarnings("unchecked")
    private Map<Long, String> resolveNoms(
            org.springframework.data.jpa.repository.JpaRepository<?, Long> repo,
            Set<Long> ids) {

        if (repo == null || ids == null || ids.isEmpty()) return Map.of();

        return ((org.springframework.data.jpa.repository.JpaRepository<Object, Long>) repo)
                .findAllById(ids)
                .stream()
                .collect(Collectors.toMap(
                        e -> getId(e),
                        e -> getNom(e)
                ));
    }

    private Long getId(Object entity) {
        try { return (Long) entity.getClass().getMethod("getId").invoke(entity); }
        catch (Exception e) { return null; }
    }

    private String getNom(Object entity) {
        try { return (String) entity.getClass().getMethod("getNom").invoke(entity); }
        catch (Exception e) { return null; }
    }
}