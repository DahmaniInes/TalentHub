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
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActiviteService {

    private final ActiviteRepository    activiteRepo;
    private final ProjetRepository      projetRepo;
    private final UtilisateurRepository utilisateurRepo;
    private final RestTemplate          restTemplate;

    // ✅ URL directe vers le nomenclature-service (sans passer par la gateway)
    // Si votre nomenclature-service tourne sur le port 8083 par exemple,
    // mettez la bonne URL. La valeur par défaut essaie via Eureka lb://
    @Value("${nomenclature.service.url:http://localhost:8083/api}")
    private String nomenclatureUrl;

    // ✅ Cache en mémoire des statuts pour éviter N appels HTTP par requête
    // Map<statutId, Map<"libelle"|"couleur"|"code", valeur>>
    private final Map<Long, Map<String, Object>> statutsCache = new ConcurrentHashMap<>();

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

    @Transactional(readOnly = true)
    public List<ActiviteDTO> getAllFiltered(
            Long projetId, Long statutId, Long utilisateurId,
            Integer priorite, boolean globalesUniquement) {
        // ✅ Charger le cache statuts une seule fois pour toute la liste
        refreshStatutsCache();
        List<Activité> list = activiteRepo.findAllFiltered(
                projetId, statutId, utilisateurId, priorite, globalesUniquement);
        return list.stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<ActiviteDTO> getGlobales() {
        refreshStatutsCache();
        return activiteRepo.findGlobales().stream().map(this::toDTO).toList();
    }

    // ✅ FIX PRINCIPAL — Enrichissement du statut depuis le cache (pas N appels HTTP)
    public ActiviteDTO toDTO(Activité a) {
        ActiviteDTO dto = new ActiviteDTO(a);
        if (a.getStatutActiviteId() != null) {
            Map<String, Object> statut = getStatutFromCacheOrFetch(a.getStatutActiviteId());
            if (statut != null) {
                dto.setStatutLibelle(String.valueOf(statut.getOrDefault("libelle", "—")));
                dto.setStatutCouleur(String.valueOf(statut.getOrDefault("couleur", "#94a3b8")));
                dto.setStatutCode(String.valueOf(statut.getOrDefault("code", "")));
            } else {
                // Fallback : afficher l'ID si le service est indisponible
                dto.setStatutLibelle("Statut #" + a.getStatutActiviteId());
                dto.setStatutCouleur("#94a3b8");
            }
        }
        return dto;
    }

    // ── Cache helpers ──

    private Map<String, Object> getStatutFromCacheOrFetch(Long statutId) {
        if (statutsCache.containsKey(statutId)) {
            return statutsCache.get(statutId);
        }
        return fetchStatutById(statutId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchStatutById(Long statutId) {
        try {
            String url = nomenclatureUrl + "/statut-activite/" + statutId;
            Map<String, Object> statut = restTemplate.getForObject(url, Map.class);
            if (statut != null) {
                statutsCache.put(statutId, statut);
            }
            return statut;
        } catch (Exception e) {
            log.warn("Impossible de charger le statut {} depuis nomenclature-service: {}",
                    statutId, e.getMessage());
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
                    if (idObj != null) {
                        Long id = Long.valueOf(idObj.toString());
                        statutsCache.put(id, s);
                    }
                });
                log.debug("Cache statuts rechargé: {} statuts", statutsCache.size());
            }
        } catch (Exception e) {
            log.warn("Impossible de recharger le cache statuts: {}", e.getMessage());
        }
    }

    // Vider le cache (utile après modification des statuts)
    public void clearStatutsCache() {
        statutsCache.clear();
    }

    // ── Création ──
    @Transactional
    public Activité create(Activité activite, Long projetId, Long utilisateurId) {
        if (activite.getStatutActiviteId() == null) {
            activite.setStatutActiviteId(1L);
        }
        if (projetId != null) {
            Projet projet = projetRepo.findById(projetId)
                    .orElseThrow(() -> new RuntimeException("Projet non trouvé: " + projetId));
            activite.setProjet(projet);
            long count = activiteRepo.countByProjetId(projetId) + 1;
            activite.setNumeroActivite(String.format("ACT-%03d", count));
        } else {
            long count = activiteRepo.count() + 1;
            activite.setNumeroActivite(String.format("GACT-%03d", count));
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
        if (details.getStatutActiviteId() != null) {
            existing.setStatutActiviteId(details.getStatutActiviteId());
        }
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

    @Transactional
    public Activité changerStatut(Long activiteId, Long nouveauStatutId) {
        Activité a = getById(activiteId);
        if (nouveauStatutId != null) {
            a.setStatutActiviteId(nouveauStatutId);
        }
        return activiteRepo.save(a);
    }

    @Transactional
    public void delete(Long id) {
        activiteRepo.deleteById(id);
    }
}