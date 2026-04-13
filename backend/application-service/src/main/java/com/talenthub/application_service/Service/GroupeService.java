package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.GroupeRequest;
import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Repository.GroupeRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GroupeService {

    private final GroupeRepository     groupeRepo;
    private final UtilisateurRepository utilisateurRepo;

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

    @Transactional
    public Groupe update(Long id, GroupeRequest req) {
        Groupe existing = getById(id);
        existing.setNom(req.getNom());
        existing.setDescription(req.getDescription());
        existing.setCouleur(req.getCouleur());
        existing.setTeamLeadId(req.getTeamLeadId());
        existing.setActif(req.isActif());

        if (req.getMembresIds() != null) {
            List<Utilisateur> membres = utilisateurRepo.findAllById(req.getMembresIds());
            existing.setMembres(membres);
        }
        return groupeRepo.save(existing);
    }

    @Transactional
    public void delete(Long id) {
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

    @Transactional
    public Groupe removeMembre(Long groupeId, Long userId) {
        Groupe groupe = getById(groupeId);
        groupe.getMembres().removeIf(u -> u.getId().equals(userId));
        if (groupeId.equals(groupe.getTeamLeadId())) {
            groupe.setTeamLeadId(null);
        }
        return groupeRepo.save(groupe);
    }

    @Transactional
    public Groupe setTeamLead(Long groupeId, Long userId) {
        Groupe groupe = getById(groupeId);
        groupe.setTeamLeadId(userId);
        return groupeRepo.save(groupe);
    }
}