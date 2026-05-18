// Service/ActiviteService.java — COMPLET avec delete en cascade manuelle
package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.ActiviteDTO;
import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Repository.*;
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

    // ✅ Pour la suppression en cascade manuelle
    private final CommentaireRepository commentaireRepository;

    @Value("${nomenclature.service.url:http://localhost:8083/api}")
    private String nomenclatureUrl;

    private final Map<Long, Map<String, Object>> statutsCache = new ConcurrentHashMap<>();

    // ── Lecture ──────────────────────────────────────────────────────────────

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
    public List<ActiviteDTO> getAllFiltered(Long statutId, Long utilisateurId,
                                            Integer priorite, boolean globalesUniquement) {
        refreshStatutsCache();
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

    // ── Cache statuts ─────────────────────────────────────────────────────────

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

    // ── Création ─────────────────────────────────────────────────────────────

    @Transactional
    public Activité create(Activité activite, Long utilisateurId, List<Long> groupeIds) {
        if (activite.getStatutActiviteId() == null) activite.setStatutActiviteId(1L);

        long count = activiteRepo.count() + 1;
        String prefix = activite.isEstGlobale() ? "GACT" : "ACT";
        activite.setNumeroActivite(String.format("%s-%03d", prefix, count));

        if (groupeIds != null && !groupeIds.isEmpty()) {
            List<Groupe> groupes = groupeRepo.findAllById(groupeIds);
            activite.setGroupes(new ArrayList<>(groupes));
        }
        if (utilisateurId != null) {
            utilisateurRepo.findById(utilisateurId).ifPresent(activite::setUtilisateur);
        }
        return activiteRepo.save(activite);
    }

    // ── Mise à jour ───────────────────────────────────────────────────────────

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
        existing.setEstGlobale(details.isEstGlobale());
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

    // ── SUPPRESSION avec cascade manuelle ─────────────────────────────────────

    @Transactional
    public void delete(Long id) {
        Activité activite = activiteRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité non trouvée: " + id));

        log.info("🗑️ Suppression activité id={} '{}'", id, activite.getNom());

        // 1. Supprimer les commentaires liés à cette activité
        try {
            int nb = commentaireRepository.deleteByActiviteId(id);
            log.debug("  → {} commentaire(s) supprimé(s)", nb);
        } catch (Exception e) {
            log.warn("  ⚠️ Commentaires: {}", e.getMessage());
        }

        // 2. Dissocier les groupes (table de jointure activite_groupes)
        try {
            activite.getGroupes().clear();
            activiteRepo.save(activite);
        } catch (Exception e) {
            log.warn("  ⚠️ Groupes: {}", e.getMessage());
        }

        // 3. Supprimer l'activité
        activiteRepo.deleteById(id);
        log.info("  ✅ Activité id={} supprimée", id);
    }

    @Transactional
    public Activité changerStatut(Long activiteId, Long nouveauStatutId) {
        Activité a = getById(activiteId);
        if (nouveauStatutId != null) a.setStatutActiviteId(nouveauStatutId);
        return activiteRepo.save(a);
    }

    public void clearStatutsCache() { statutsCache.clear(); }
}