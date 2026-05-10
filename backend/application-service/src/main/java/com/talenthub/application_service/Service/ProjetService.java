// src/main/java/com/talenthub/application_service/Service/ProjetService.java
package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.ProjetDTO;
import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Entity.Client;
import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Repository.ClientRepository;
import com.talenthub.application_service.Repository.GroupeRepository;
import com.talenthub.application_service.Repository.ProjetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.talenthub.application_service.Repository.ActiviteRepository;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjetService {

    private final ProjetRepository  projetRepository;
    private final ClientRepository  clientRepository;
    private final GroupeRepository  groupeRepository;
    private final ActiviteRepository activiteRepository;

    // ── Lecture ──

    @Transactional(readOnly = true)
    public List<Projet> getAll() {
        return projetRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Projet> getByClient(Long clientId) {
        return projetRepository.findByClientId(clientId);
    }

    @Transactional(readOnly = true)
    public List<Projet> getByStatut(String statut) {
        return projetRepository.findByStatut(statut);
    }

    @Transactional(readOnly = true)
    public List<Projet> getByMembre(Long userId) {
        return projetRepository.findByMembreUtilisateurId(userId);
    }

    @Transactional(readOnly = true)
    public Projet getById(Long id) {
        return projetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé: " + id));
    }

    // ✅ findByIdWithDetails — charge client + groupes (sans g.membres pour éviter MultipleBag)
    @Transactional(readOnly = true)
    public Projet getByIdWithDetails(Long id) {
        return projetRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé: " + id));
    }

    // ✅ toDTO — enrichit les groupes avec nombreProjetsActifs
    // DOIT être appelé dans une transaction active (appelant annoté @Transactional)
    @Transactional(readOnly = true)
    public ProjetDTO toDTO(Projet p) {
        ProjetDTO dto = new ProjetDTO(p);
        if (dto.getGroupes() != null) {
            dto.getGroupes().forEach(g -> {
                try {
                    int nb = projetRepository.countProjetsActifsByGroupeId(g.getId());
                    g.setNombreProjetsActifs(nb);
                } catch (Exception e) {
                    g.setNombreProjetsActifs(0);
                }
            });
        }
        return dto;
    }

    // ── Conversion liste → DTO (sans enrichissement pour la liste principale) ──
    @Transactional(readOnly = true)
    public List<ProjetDTO> getAllDTO() {
        return projetRepository.findAll().stream()
                .map(p -> {
                    try {
                        // Pour la liste, charger le détail complet (avec groupes)
                        Projet detail = projetRepository.findByIdWithDetails(p.getId())
                                .orElse(p);
                        return new ProjetDTO(detail);
                    } catch (Exception e) {
                        return new ProjetDTO(p);
                    }
                })
                .toList();
    }

    // ── Création ──

    @Transactional
    public Projet create(Projet projet, Long clientId, List<Long> groupeIds) {
        if (clientId != null) {
            Client client = clientRepository.findById(clientId)
                    .orElseThrow(() -> new RuntimeException("Client non trouvé: " + clientId));
            projet.setClient(client);
        }
        if (projet.getNumeroProjet() == null || projet.getNumeroProjet().isBlank()) {
            projet.setNumeroProjet(generateNextNumeroProjet());
        }
        if (groupeIds != null && !groupeIds.isEmpty()) {
            List<Groupe> groupes = groupeRepository.findAllById(groupeIds);
            projet.setGroupes(new ArrayList<>(groupes));
        }
        return projetRepository.save(projet);
    }


    @Transactional
    public Projet create(Projet projet, Long clientId, List<Long> groupeIds, List<Long> activiteIds) {
        if (clientId != null) {
    Client client = clientRepository.findById(clientId)
            .orElseThrow(() -> new RuntimeException("Client non trouvé: " + clientId));
        projet.setClient(client);
}
    if (projet.getNumeroProjet() == null || projet.getNumeroProjet().isBlank()) {
            projet.setNumeroProjet(generateNextNumeroProjet());
            }
            if (groupeIds != null && !groupeIds.isEmpty()) {
            List<Groupe> groupes = groupeRepository.findAllById(groupeIds);
        projet.setGroupes(new ArrayList<>(groupes));
        }
        // ✅ Activités assignées
        if (activiteIds != null && !activiteIds.isEmpty()) {
        List<Activité> activites = activiteRepository.findAllById(activiteIds);
        projet.setActivites(new ArrayList<>(activites));
        }
        return projetRepository.save(projet);
        }

    private String generateNextNumeroProjet() {
        String maxNumero = projetRepository.findMaxNumeroProjet();
        int next = 1;
        if (maxNumero != null && maxNumero.startsWith("PRJ-")) {
            try {
                next = Integer.parseInt(maxNumero.substring(4)) + 1;
            } catch (NumberFormatException e) {
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
                .orElseThrow(() -> new RuntimeException("Projet non trouvé: " + id));



        if (details.getNom() != null && !details.getNom().isBlank()) {
            existing.setNom(details.getNom());
        }
        existing.setDescription(details.getDescription());
        existing.setCouleur(details.getCouleur());
        existing.setDateDebut(details.getDateDebut());
        existing.setDateFin(details.getDateFin());
        existing.setDateFinReelle(details.getDateFinReelle());

        if (details.getStatut() != null) {
            existing.setStatut(details.getStatut());
        }
        existing.setAvancement(details.getAvancement());
        existing.setBudgetPrevu(details.getBudgetPrevu());

        if (details.getBudgetConsomme() != null) {
            existing.setBudgetConsomme(details.getBudgetConsomme());
        }
        existing.setQuotaHoraire(details.getQuotaHoraire());

        if (details.getTypeBudget() != null) {
            existing.setTypeBudget(details.getTypeBudget());
        }
        if (details.getSeuilAlerteHoraire() != null) {
            existing.setSeuilAlerteHoraire(details.getSeuilAlerteHoraire());
        }
        existing.setVisible(details.isVisible());
        existing.setFacturable(details.isFacturable());
        existing.setAutoriserActivitesGlobales(details.isAutoriserActivitesGlobales());
        existing.setResponsableKeycloakId(details.getResponsableKeycloakId());

        if (details.getProjetAdmins() != null) {
            existing.setProjetAdmins(details.getProjetAdmins());
        }

        if (clientId != null) {
            Client client = clientRepository.findById(clientId)
                    .orElseThrow(() -> new RuntimeException("Client non trouvé: " + clientId));
            existing.setClient(client);
        }

        if (groupeIds != null) {
            existing.setGroupes(groupeIds.isEmpty()
                    ? new ArrayList<>()
                    : new ArrayList<>(groupeRepository.findAllById(groupeIds)));
        }

        // ✅ Activités
        if (activiteIds != null) {
            existing.setActivites(activiteIds.isEmpty()
                    ? new ArrayList<>()
                    : new ArrayList<>(activiteRepository.findAllById(activiteIds)));
        }

        return projetRepository.save(existing);
    }

    /*@Transactional
    public Projet update(Long id, Projet details, Long clientId) {
        return update(id, details, clientId, null);
    }*/

    @Transactional
    public void delete(Long id) {
        projetRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<Groupe> getGroupesByProjet(Long projetId) {
        Projet p = getByIdWithDetails(projetId);
        return p.getGroupes();
    }

    @Transactional
    public Projet assignerActivites(Long projetId, List<Long> activiteIds) {
        Projet projet = projetRepository.findById(projetId)
                .orElseThrow(() -> new RuntimeException("Projet non trouvé: " + projetId));

        if (activiteIds == null || activiteIds.isEmpty()) {
            projet.getActivites().clear();
        } else {
            List<Activité> activites = activiteRepository.findAllById(activiteIds);
            projet.setActivites(new ArrayList<>(activites));
        }
        return projetRepository.save(projet);
    }
}