package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.GroupeRequest;
import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Repository.ActiviteRepository;
import com.talenthub.application_service.Repository.GroupeRepository;
import com.talenthub.application_service.Repository.LigneFeuilleTempsRepository;
import com.talenthub.application_service.Repository.ProjetRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupeService {

    private final GroupeRepository      groupeRepo;
    private final UtilisateurRepository utilisateurRepo;
    // ✅ nécessaires pour le nettoyage des assignations d'activités
    // lors du retrait d'un membre (voir removeMembre() / nettoyerAssignationsApresRetrait()).
    private final ProjetRepository            projetRepo;
    private final ActiviteRepository          activiteRepo;
    private final LigneFeuilleTempsRepository ligneFeuilleTempsRepo;

    @Transactional(readOnly = true)
    public List<Groupe> getAll() {
        return groupeRepo.findAll();
    }

    @Transactional(readOnly = true)
    public Groupe getById(Long id) {
        return groupeRepo.findByIdWithMembres(id)
                .orElseThrow(() -> new RuntimeException("Groupe non trouvé: " + id));
    }

    @Transactional(readOnly = true)
    public List<Groupe> getByMembre(Long userId) {
        return groupeRepo.findGroupesByMembreId(userId);
    }

    @Transactional
    public Groupe create(GroupeRequest req) {
        if (groupeRepo.existsByNomIgnoreCase(req.getNom())) {
            throw new RuntimeException("Un groupe avec ce nom existe déjà.");
        }
        Groupe groupe = Groupe.builder()
                .nom(req.getNom())
                .description(req.getDescription())
                .couleur(req.getCouleur() != null ? req.getCouleur() : "#6366f1")
                .teamLeadId(req.getTeamLeadId())
                .actif(req.isActif())
                .membres(new ArrayList<>())
                .build();

        if (req.getMembresIds() != null && !req.getMembresIds().isEmpty()) {
            List<Utilisateur> membres = utilisateurRepo.findAllById(req.getMembresIds());
            groupe.setMembres(membres);
        }
        return groupeRepo.save(groupe);
    }

    // ════════════════════════════════════════════════════════════
    // Si la liste complète des membres est remplacée (formulaire d'édition
    // envoyant la liste à jour plutôt que d'appeler addMembre/removeMembre
    // individuellement), on applique le MÊME nettoyage que removeMembre()
    // pour chaque membre retiré par cette mise à jour groupée.
    // ════════════════════════════════════════════════════════════
    @Transactional
    public Groupe update(Long id, GroupeRequest req) {
        Groupe existing = getById(id);
        existing.setNom(req.getNom());
        existing.setDescription(req.getDescription());
        existing.setCouleur(req.getCouleur());
        existing.setTeamLeadId(req.getTeamLeadId());
        existing.setActif(req.isActif());

        if (req.getMembresIds() != null) {
            List<Long> nouveauxIds = req.getMembresIds();
            List<Long> anciensIds = existing.getMembres().stream().map(Utilisateur::getId).toList();
            List<Long> retires = anciensIds.stream().filter(uid -> !nouveauxIds.contains(uid)).toList();

            List<Utilisateur> membres = utilisateurRepo.findAllById(nouveauxIds);
            existing.setMembres(membres);
            Groupe saved = groupeRepo.save(existing);

            for (Long utilisateurId : retires) {
                nettoyerAssignationsApresRetrait(saved.getId(), utilisateurId);
            }
            return saved;
        }
        return groupeRepo.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        if (!groupeRepo.existsById(id)) {
            throw new RuntimeException("Groupe non trouvé: " + id);
        }

        groupeRepo.deleteGroupeUtilisateursByGroupeId(id);
        groupeRepo.deleteProjetGroupesByGroupeId(id);

        groupeRepo.deleteById(id);
    }

    @Transactional
    public Groupe addMembre(Long groupeId, Long userId) {
        Groupe groupe = getById(groupeId);
        Utilisateur u = utilisateurRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé: " + userId));
        if (!groupe.getMembres().contains(u)) {
            groupe.getMembres().add(u);
        }
        return groupeRepo.save(groupe);
    }

    // ════════════════════════════════════════════════════════════
    // Retrait d'un membre d'un groupe, avec nettoyage des assignations
    // d'activités sur les projets concernés.
    //
    // Logique :
    // 1. On retire U de G.
    // 2. Pour chaque projet P assigné à G : si U appartient ENCORE à un
    //    autre groupe assigné à P, on ne touche à RIEN pour P.
    // 3. Sinon : pour chaque activité de P où U est assigné, on vérifie
    //    s'il a déjà pointé des heures dessus.
    //    - Si OUI → on garde l'assignation ET les lignes.
    //    - Si NON → on retire U de la liste des assignés à cette activité.
    // Aucune LigneFeuilleTemps n'est jamais supprimée dans ce flux.
    // ════════════════════════════════════════════════════════════
    @Transactional
    public Groupe removeMembre(Long groupeId, Long userId) {
        Groupe groupe = getById(groupeId);
        groupe.getMembres().removeIf(u -> u.getId().equals(userId));
        if (groupeId.equals(groupe.getTeamLeadId())) {
            groupe.setTeamLeadId(null);
        }
        Groupe saved = groupeRepo.save(groupe);

        nettoyerAssignationsApresRetrait(groupeId, userId);

        return saved;
    }

    private void nettoyerAssignationsApresRetrait(Long groupeIdRetire, Long utilisateurId) {
        List<Projet> projetsDuGroupeRetire = projetRepo.findByGroupeId(groupeIdRetire);

        for (Projet projet : projetsDuGroupeRetire) {
            Projet projetComplet = projetRepo.findByIdWithDetails(projet.getId()).orElse(projet);

            if (utilisateurEncoreMembreDunGroupeDuProjet(projetComplet, utilisateurId)) {
                continue;
            }
            nettoyerActivitesDuProjetPourUtilisateur(projetComplet.getId(), utilisateurId);
        }
    }

    private boolean utilisateurEncoreMembreDunGroupeDuProjet(Projet projet, Long utilisateurId) {
        for (Groupe g : projet.getGroupes()) {
            boolean estMembre = g.getMembres().stream()
                    .anyMatch(m -> m.getId().equals(utilisateurId));
            if (estMembre) return true;
        }
        return false;
    }

    private void nettoyerActivitesDuProjetPourUtilisateur(Long projetId, Long utilisateurId) {
        List<Activité> activitesAssignees = activiteRepo
                .findByUtilisateurIdAndProjetIdIn(utilisateurId, List.of(projetId));

        for (Activité activite : activitesAssignees) {
            boolean aDejaTravaille = ligneFeuilleTempsRepo
                    .existsByActiviteIdAndUtilisateurId(activite.getId(), utilisateurId);

            if (aDejaTravaille) {
                log.debug("  → activité {} conservée pour utilisateur {} (heures déjà pointées)",
                        activite.getId(), utilisateurId);
                continue;
            }

            activite.getUtilisateurs().removeIf(u -> u.getId().equals(utilisateurId));
            activiteRepo.save(activite);
            log.info("  ➖ Utilisateur {} retiré de l'assignation activité {} (projet {}, aucune heure pointée)",
                    utilisateurId, activite.getId(), projetId);
        }
    }

    @Transactional
    public Groupe setTeamLead(Long groupeId, Long userId) {
        Groupe groupe = getById(groupeId);
        groupe.setTeamLeadId(userId);
        return groupeRepo.save(groupe);
    }

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Sert au dropdown Utilisateur de Ma Semaine pour
    // TS_GROUP_READ/UPDATE : tous les coéquipiers de l'utilisateur
    // (membres distincts de tous les groupes auxquels il appartient),
    // l'utilisateur lui-même exclu du résultat.
    // ════════════════════════════════════════════════════════════
    @Transactional(readOnly = true)
    public List<Utilisateur> getCoequipiersDe(Long utilisateurId) {
        return groupeRepo.findCoequipiersDe(utilisateurId).stream()
                .filter(u -> !u.getId().equals(utilisateurId))
                .toList();
    }

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Sert au dropdown Utilisateur de Ma Semaine pour
    // TS_ALL_READ/UPDATE : tous les utilisateurs membres d'au moins un
    // groupe dans toute l'application, l'utilisateur connecté exclu du
    // résultat (il apparaît déjà comme option "moi" dans le sélecteur).
    // ════════════════════════════════════════════════════════════
    @Transactional(readOnly = true)
    public List<Utilisateur> getTousMembresDeGroupes(Long utilisateurConnecteId) {
        return groupeRepo.findTousMembresDeGroupes().stream()
                .filter(u -> !u.getId().equals(utilisateurConnecteId))
                .toList();
    }
}