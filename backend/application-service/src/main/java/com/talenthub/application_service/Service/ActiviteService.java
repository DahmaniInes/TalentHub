// src/main/java/com/talenthub/application_service/Service/ActiviteService.java
package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.ActiviteDTO;
import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Repository.ActiviteRepository;
import com.talenthub.application_service.Repository.ProjetRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ActiviteService {

    private final ActiviteRepository    activiteRepo;
    private final ProjetRepository      projetRepo;
    private final UtilisateurRepository utilisateurRepo;
    private final RestTemplate          restTemplate;   // déclaré dans un @Bean ci-dessous

    // URL du nomenclature-service (via gateway ou direct)
    @Value("${nomenclature.service.url:http://localhost:8085/api}")
    private String nomenclatureUrl;

    // ── Lecture ──
    @Transactional(readOnly = true)
    public List<Activité> getByProjet(Long projetId) {
        return activiteRepo.findByProjetIdOrderByNumeroActivite(projetId);
    }

    @Transactional(readOnly = true)
    public List<Activité> getByProjetAndStatut(Long projetId, Long statutId) {
        return activiteRepo.findByProjetIdAndStatutActiviteId(projetId, statutId);
    }

    @Transactional(readOnly = true)
    public List<Activité> getByUtilisateur(Long userId) {
        return activiteRepo.findByUtilisateurId(userId);
    }

    @Transactional(readOnly = true)
    public Activité getById(Long id) {
        return activiteRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité non trouvée: " + id));
    }

    // ── Enrichissement DTO avec libellé statut depuis nomenclature-service ──
    public ActiviteDTO toDTO(Activité a) {
        ActiviteDTO dto = new ActiviteDTO(a);
        try {
            // Appel HTTP simple — pas de Feign, pas de fallback
            String url = nomenclatureUrl + "/statut-activite/" + a.getStatutActiviteId();
            @SuppressWarnings("unchecked")
            Map<String, Object> statut = restTemplate.getForObject(url, Map.class);
            if (statut != null) {
                dto.setStatutLibelle(String.valueOf(statut.getOrDefault("libelle", "—")));
                dto.setStatutCouleur(String.valueOf(statut.getOrDefault("couleur", "#94a3b8")));
                dto.setStatutCode(String.valueOf(statut.getOrDefault("code", "")));
            }
        } catch (Exception e) {
            // Si nomenclature-service est indisponible, on laisse les champs null
            // Le frontend gère l'absence de libellé
        }
        return dto;
    }

    // ── Création ──
    @Transactional
    public Activité create(Activité activite, Long projetId, Long utilisateurId) {
        if (projetId != null) {
            Projet projet = projetRepo.findById(projetId)
                    .orElseThrow(() -> new RuntimeException("Projet non trouvé: " + projetId));
            activite.setProjet(projet);
            long count = activiteRepo.countByProjetId(projetId) + 1;
            activite.setNumeroActivite(String.format("ACT-%03d", count));
        }
        if (utilisateurId != null) {
            Utilisateur u = utilisateurRepo.findById(utilisateurId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé: " + utilisateurId));
            activite.setUtilisateur(u);
        }
        return activiteRepo.save(activite);
    }

    // ── Mise à jour ──
    @Transactional
    public Activité update(Long id, Activité details, Long utilisateurId) {
        Activité existing = getById(id);
        existing.setNom(details.getNom());
        existing.setDescription(details.getDescription());
        existing.setCouleur(details.getCouleur());
        existing.setStatutActiviteId(details.getStatutActiviteId());
        existing.setBudget(details.getBudget());
        existing.setQuotaHoraire(details.getQuotaHoraire());
        existing.setTypeBudget(details.getTypeBudget());
        existing.setVisible(details.isVisible());
        existing.setFacturable(details.isFacturable());
        existing.setPriorite(details.getPriorite());
        existing.setDateEcheance(details.getDateEcheance());
        existing.setDateDebutReelle(details.getDateDebutReelle());
        existing.setDateFinReelle(details.getDateFinReelle());
        existing.setHeuresEstimees(details.getHeuresEstimees());
        existing.setHeuresPassees(details.getHeuresPassees());
        if (utilisateurId != null) {
            Utilisateur u = utilisateurRepo.findById(utilisateurId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé: " + utilisateurId));
            existing.setUtilisateur(u);
        }
        return activiteRepo.save(existing);
    }

    // ── Changer statut ──
    @Transactional
    public Activité changerStatut(Long activiteId, Long nouveauStatutId) {
        Activité a = getById(activiteId);
        a.setStatutActiviteId(nouveauStatutId);
        return activiteRepo.save(a);
    }

    @Transactional
    public void delete(Long id) {
        activiteRepo.deleteById(id);
    }
}