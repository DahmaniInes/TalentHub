// src/main/java/com/talenthub/application_service/Service/ActiviteService.java
package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.ActiviteDTO;
import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Repository.ActiviteRepository;
import com.talenthub.application_service.Repository.GroupeRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;



@Slf4j
@Service
@RequiredArgsConstructor
public class ActiviteService {

    private final ActiviteRepository    activiteRepo;
    private final UtilisateurRepository utilisateurRepo;
    private final RestTemplate          restTemplate;
    private final GroupeRepository      groupeRepo;

    @Value("${nomenclature.service.url:http://localhost:8083/api}")
    private String nomenclatureUrl;

    private final Map<Long, Map<String, Object>> statutsCache = new ConcurrentHashMap<>();

    // ── Lecture ──

    @Transactional(readOnly = true)
    public List<Activité> getByProjet(Long projetId) {
        return activiteRepo.findByProjetId(projetId);
    }

    @Transactional(readOnly = true)
    public Activité getById(Long id) {
        return activiteRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité non trouvée: " + id));
    }

    @Transactional(readOnly = true)
    public List<ActiviteDTO> getAllFiltered(
            Long statutId, Long utilisateurId,
            Integer priorite, boolean globalesUniquement) {
        refreshStatutsCache();
        // ✅ Plus de projetId dans les filtres du composant activités
        List<Activité> list = activiteRepo.findAllFiltered(
                statutId, utilisateurId, priorite, globalesUniquement);
        return list.stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<ActiviteDTO> getGlobales() {
        refreshStatutsCache();
        return activiteRepo.findGlobales().stream().map(this::toDTO).toList();
    }

    public ActiviteDTO toDTO(Activité a) {
        ActiviteDTO dto = new ActiviteDTO(a);
        if (a.getStatutActiviteId() != null) {
            Map<String, Object> statut = getStatutFromCacheOrFetch(a.getStatutActiviteId());
            if (statut != null) {
                dto.setStatutLibelle(String.valueOf(statut.getOrDefault("libelle", "—")));
                dto.setStatutCouleur(String.valueOf(statut.getOrDefault("couleur", "#94a3b8")));
                dto.setStatutCode(String.valueOf(statut.getOrDefault("code", "")));
            } else {
                dto.setStatutLibelle("Statut #" + a.getStatutActiviteId());
                dto.setStatutCouleur("#94a3b8");
            }
        }
        return dto;
    }

    // ── Cache (identique) ──
    private Map<String, Object> getStatutFromCacheOrFetch(Long statutId) {
        if (statutsCache.containsKey(statutId)) return statutsCache.get(statutId);
        return fetchStatutById(statutId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchStatutById(Long statutId) {
        try {
            String url = nomenclatureUrl + "/statut-activite/" + statutId;
            Map<String, Object> statut = restTemplate.getForObject(url, Map.class);
            if (statut != null) statutsCache.put(statutId, statut);
            return statut;
        } catch (Exception e) {
            log.warn("Impossible de charger le statut {}: {}", statutId, e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private void refreshStatutsCache() {
        try {
            String url = nomenclatureUrl + "/statut-activite";
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {});
            if (response.getBody() != null) {
                response.getBody().forEach(s -> {
                    Object idObj = s.get("id");
                    if (idObj != null) statutsCache.put(Long.valueOf(idObj.toString()), s);
                });
            }
        } catch (Exception e) {
            log.warn("Impossible de recharger le cache statuts: {}", e.getMessage());
        }
    }

    // ── Création ──
    // ✅ Plus de projetId — l'association se fait côté ProjetService
    @Transactional
    public Activité create(Activité activite, Long utilisateurId, List<Long> groupeIds) {
        if (activite.getStatutActiviteId() == null) activite.setStatutActiviteId(1L);

        // Génération du numéro
        long count = activiteRepo.count() + 1;
        String prefix = activite.isEstGlobale() ? "GACT" : "ACT";
        activite.setNumeroActivite(String.format("%s-%03d", prefix, count));

        // Groupes
        if (groupeIds != null && !groupeIds.isEmpty()) {
            List<Groupe> groupes = groupeRepo.findAllById(groupeIds);
            activite.setGroupes(new ArrayList<>(groupes));
        }

        // Utilisateur
        if (utilisateurId != null) {
            utilisateurRepo.findById(utilisateurId).ifPresent(activite::setUtilisateur);
        }

        return activiteRepo.save(activite);
    }

    @Transactional
    public Activité update(Long id, Activité details, Long utilisateurId, List<Long> groupeIds) {
        Activité existing = getById(id);
        existing.setNom(details.getNom());
        existing.setDescription(details.getDescription());
        existing.setCouleur(details.getCouleur());
        if (details.getStatutActiviteId() != null)
            existing.setStatutActiviteId(details.getStatutActiviteId());
        existing.setBudget(details.getBudget());
        existing.setQuotaHoraire(details.getQuotaHoraire());
        existing.setTypeBudget(details.getTypeBudget());
        existing.setVisible(details.isVisible());
        existing.setFacturable(details.isFacturable());
        existing.setEstGlobale(details.isEstGlobale()); // ✅
        existing.setPriorite(details.getPriorite());
        existing.setDateEcheance(details.getDateEcheance());
        existing.setDateDebutReelle(details.getDateDebutReelle());
        existing.setDateFinReelle(details.getDateFinReelle());
        existing.setHeuresEstimees(details.getHeuresEstimees());
        existing.setHeuresPassees(details.getHeuresPassees());

        if (groupeIds != null) {
            existing.setGroupes(groupeIds.isEmpty()
                    ? new ArrayList<>()
                    : new ArrayList<>(groupeRepo.findAllById(groupeIds)));
        }

        if (utilisateurId != null) {
            utilisateurRepo.findById(utilisateurId).ifPresent(existing::setUtilisateur);
        }

        return activiteRepo.save(existing);
    }

    @Transactional
    public Activité changerStatut(Long activiteId, Long nouveauStatutId) {
        Activité a = getById(activiteId);
        if (nouveauStatutId != null) a.setStatutActiviteId(nouveauStatutId);
        return activiteRepo.save(a);
    }

    @Transactional
    public void delete(Long id) { activiteRepo.deleteById(id); }

    public void clearStatutsCache() { statutsCache.clear(); }
}