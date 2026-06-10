package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.ProjetDTO;
import com.talenthub.application_service.Entity.*;
import com.talenthub.application_service.Repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjetService {

    private final ProjetRepository       projetRepository;
    private final ClientRepository       clientRepository;
    private final GroupeRepository       groupeRepository;
    private final ActiviteRepository     activiteRepository;
    private final UtilisateurRepository  utilisateurRepository;
    private final CommentaireRepository  commentaireRepository;
    private final MembreEquipeRepository membreEquipeRepository;

    @Transactional(readOnly = true)
    public List<Projet> getAll() { return projetRepository.findAll(); }

    @Transactional(readOnly = true)
    public List<Projet> getByClient(Long clientId) {
        return projetRepository.findByClientId(clientId);
    }

    // ✅ Remplace findByStatut(String) — utilise l'ID nomenclature
    @Transactional(readOnly = true)
    public List<Projet> getByStatutId(Long statutId) {
        return projetRepository.findByStatutProjetId(statutId);
    }

    @Transactional(readOnly = true)
    public List<Projet> getByMembre(Long userId) {
        return projetRepository.findByMembreUtilisateurId(userId);
    }

    @Transactional(readOnly = true)
    public Projet getById(Long id) {
        return projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Projet non trouvé: " + id));
    }

    @Transactional(readOnly = true)
    public Projet getByIdWithDetails(Long id) {
        return projetRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new RuntimeException(
                        "Projet non trouvé: " + id));
    }

    @Transactional(readOnly = true)
    public ProjetDTO toDTO(Projet p) {
        ProjetDTO dto = new ProjetDTO(p);
        if (dto.getGroupes() != null) {
            dto.getGroupes().forEach(g -> {
                try {
                    int nb = projetRepository.countProjetsActifsByGroupeId(
                            g.getId());
                    g.setNombreProjetsActifs(nb);
                } catch (Exception e) {
                    g.setNombreProjetsActifs(0);
                }
            });
        }
        return dto;
    }

    @Transactional(readOnly = true)
    public List<ProjetDTO> getAllDTO() {
        return projetRepository.findAll().stream()
                .map(p -> {
                    try {
                        return new ProjetDTO(
                                projetRepository.findByIdWithDetails(
                                        p.getId()).orElse(p));
                    } catch (Exception e) {
                        return new ProjetDTO(p);
                    }
                })
                .toList();
    }

    @Transactional
    public Projet create(Projet projet, Long clientId,
                         List<Long> groupeIds, List<Long> activiteIds) {
        if (clientId != null) {
            Client client = clientRepository.findById(clientId)
                    .orElseThrow(() -> new RuntimeException(
                            "Client non trouvé: " + clientId));
            projet.setClient(client);
        }
        if (projet.getNumeroProjet() == null
                || projet.getNumeroProjet().isBlank()) {
            projet.setNumeroProjet(generateNextNumeroProjet());
        }
        if (groupeIds != null && !groupeIds.isEmpty())
            projet.setGroupes(new ArrayList<>(
                    groupeRepository.findAllById(groupeIds)));
        if (activiteIds != null && !activiteIds.isEmpty())
            projet.setActivites(new ArrayList<>(
                    activiteRepository.findAllById(activiteIds)));

        return projetRepository.save(projet);
    }

    @Transactional
    public Projet create(Projet projet, Long clientId, List<Long> groupeIds) {
        return create(projet, clientId, groupeIds, null);
    }

    private String generateNextNumeroProjet() {
        String maxNumero = projetRepository.findMaxNumeroProjet();
        int next = 1;
        if (maxNumero != null && maxNumero.startsWith("PRJ-")) {
            try { next = Integer.parseInt(maxNumero.substring(4)) + 1; }
            catch (NumberFormatException e) {
                next = (int) projetRepository.count() + 1;
            }
        } else {
            next = (int) projetRepository.count() + 1;
        }
        return String.format("PRJ-%04d", next);
    }

    @Transactional
    public Projet update(Long id, Projet details, Long clientId,
                         List<Long> groupeIds, List<Long> activiteIds) {
        Projet existing = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Projet non trouvé: " + id));

        if (details.getNom() != null && !details.getNom().isBlank())
            existing.setNom(details.getNom());
        existing.setDescription(details.getDescription());
        existing.setCouleur(details.getCouleur());
        existing.setDateDebut(details.getDateDebut());
        existing.setDateFin(details.getDateFin());
        existing.setDateFinReelle(details.getDateFinReelle());

        if (details.getStatutProjetId() != null)
            existing.setStatutProjetId(details.getStatutProjetId());
        if (details.getTypeProjetId() != null)
            existing.setTypeProjetId(details.getTypeProjetId());

        existing.setAvancement(details.getAvancement());
        existing.setBudgetPrevu(details.getBudgetPrevu());
        if (details.getBudgetConsomme() != null)
            existing.setBudgetConsomme(details.getBudgetConsomme());
        existing.setHeuresEstimees(details.getHeuresEstimees());
        if (details.getTypeBudget() != null)
            existing.setTypeBudget(details.getTypeBudget());
        if (details.getSeuilAlerteHoraire() != null)
            existing.setSeuilAlerteHoraire(details.getSeuilAlerteHoraire());
        existing.setVisible(details.isVisible());
        existing.setFacturable(details.isFacturable());
        existing.setAutoriserActivitesGlobales(
                details.isAutoriserActivitesGlobales());
        existing.setResponsableKeycloakId(details.getResponsableKeycloakId());
        if (details.getProjetAdmins() != null)
            existing.setProjetAdmins(details.getProjetAdmins());

        if (clientId != null) {
            Client client = clientRepository.findById(clientId)
                    .orElseThrow(() -> new RuntimeException(
                            "Client non trouvé: " + clientId));
            existing.setClient(client);
        }
        if (groupeIds != null) {
            existing.setGroupes(groupeIds.isEmpty()
                    ? new ArrayList<>()
                    : new ArrayList<>(groupeRepository.findAllById(groupeIds)));
        }
        if (activiteIds != null) {
            existing.setActivites(activiteIds.isEmpty()
                    ? new ArrayList<>()
                    : new ArrayList<>(
                    activiteRepository.findAllById(activiteIds)));
        }
        return projetRepository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        Projet projet = projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(
                        "Projet non trouvé: " + id));

        log.info("🗑️ Suppression projet id={} '{}'", id, projet.getNom());

        try {
            int nb = commentaireRepository.deleteByProjetId(id);
            log.debug("  → {} commentaire(s) supprimé(s)", nb);
        } catch (Exception e) {
            log.warn("  ⚠️ Commentaires: {}", e.getMessage());
        }
        try {
            int nb = membreEquipeRepository.deleteByProjetId(id);
            log.debug("  → {} membre(s) équipe supprimé(s)", nb);
        } catch (Exception e) {
            log.warn("  ⚠️ MembreEquipe: {}", e.getMessage());
        }
        try {
            projet.getGroupes().clear();
            projetRepository.save(projet);
        } catch (Exception e) {
            log.warn("  ⚠️ Groupes: {}", e.getMessage());
        }
        try {
            projet.getActivites().clear();
            projetRepository.save(projet);
        } catch (Exception e) {
            log.warn("  ⚠️ Activités: {}", e.getMessage());
        }

        projetRepository.deleteById(id);
        log.info("  ✅ Projet id={} supprimé", id);
    }

    @Transactional(readOnly = true)
    public List<Groupe> getGroupesByProjet(Long projetId) {
        return getByIdWithDetails(projetId).getGroupes();
    }

    @Transactional
    public Projet assignerActivites(Long projetId, List<Long> activiteIds) {
        Projet projet = projetRepository.findById(projetId)
                .orElseThrow(() -> new RuntimeException(
                        "Projet non trouvé: " + projetId));
        if (activiteIds == null || activiteIds.isEmpty())
            projet.getActivites().clear();
        else
            projet.setActivites(new ArrayList<>(
                    activiteRepository.findAllById(activiteIds)));
        return projetRepository.save(projet);
    }

    // ── Projets de stage ─────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<Projet> getProjetsStage() {
        return projetRepository.findByTypeProjetId(3L);
    }

    // ✅ Import MembreEquipe ajouté dans la classe Entity.*
    @Transactional(readOnly = true)
    public List<Projet> getProjetsParStagiaire(Long utilisateurId) {
        return membreEquipeRepository.findByUtilisateurId(utilisateurId)
                .stream()
                .filter(m -> m.getStage() != null)
                .map(MembreEquipe::getProjet)
                .distinct()
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Projet> getProjetsParSuperviseur(Long superviseurId) {
        return utilisateurRepository.findById(superviseurId)
                .map(sup -> sup.getStagiairesEncadres().stream()
                        .flatMap(stag -> membreEquipeRepository
                                .findByUtilisateurId(stag.getId()).stream()
                                .filter(m -> m.getStage() != null)
                                .map(MembreEquipe::getProjet))
                        .distinct()
                        .toList())
                .orElse(List.of());
    }
}