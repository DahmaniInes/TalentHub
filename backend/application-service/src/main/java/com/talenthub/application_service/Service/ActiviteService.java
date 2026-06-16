// Service/ActiviteService.java — REMPLACE COMPLET
package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.ActiviteDTO;
import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.Utilisateur;
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
    private final AvancementService avancementService;
    private final ActiviteRepository    activiteRepo;
    private final UtilisateurRepository utilisateurRepo;
    private final RestTemplate          restTemplate;
    private final GroupeRepository      groupeRepo;
    private final CommentaireRepository commentaireRepository;
    private final DocumentRepository    documentRepo;

    @Value("${nomenclature.service.url:http://localhost:8083/api}")
    private String nomenclatureUrl;

    // ── Caches ───────────────────────────────────────────────────────────────
    // Cache statuts activité : id → { id, libelle, couleur, code }
    private final Map<Long, Map<String, Object>> statutsCache   = new ConcurrentHashMap<>();
    // Cache priorités activité : id → { id, libelle, couleur, code }
    private final Map<Long, Map<String, Object>> prioritesCache = new ConcurrentHashMap<>();

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
                                            Long prioriteId, boolean globalesUniquement) {
        refreshStatutsCache();
        refreshPrioritesCache();
        List<Activité> list = activiteRepo.findAllFiltered(
                statutId, utilisateurId, prioriteId, globalesUniquement);
        return list.stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<ActiviteDTO> getGlobales() {
        refreshStatutsCache();
        refreshPrioritesCache();
        return activiteRepo.findGlobales().stream().map(this::toDTO).toList();
    }

    // ── Enrichissement DTO ───────────────────────────────────────────────────

    public ActiviteDTO toDTO(Activité a) {
        ActiviteDTO dto = new ActiviteDTO(a);

        // Enrichir statut
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

        // ── Enrichir priorité depuis nomenclature-service ──
        if (a.getPrioriteId() != null) {
            Map<String, Object> priorite = getPrioriteFromCacheOrFetch(a.getPrioriteId());
            if (priorite != null) {
                dto.setPrioriteLibelle(String.valueOf(priorite.getOrDefault("libelle", "—")));
                dto.setPrioriteCouleur(String.valueOf(priorite.getOrDefault("couleur", "#94a3b8")));
                dto.setPrioriteCode(String.valueOf(priorite.getOrDefault("code", "")));
            }
        }
// Dans toDTO(), APRÈS avoir construit le dto, AVANT le return :
        dto.setNombreCommentaires(
                (int) commentaireRepository.countByActiviteId(a.getId()));
        dto.setNombreDocuments(
                (int) documentRepo.countByActiviteId(a.getId()));
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

    // ── Cache priorités ────────────────────────────────────────────────────────

    private Map<String, Object> getPrioriteFromCacheOrFetch(Long prioriteId) {
        if (prioritesCache.containsKey(prioriteId)) return prioritesCache.get(prioriteId);
        return fetchPrioriteById(prioriteId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchPrioriteById(Long prioriteId) {
        try {
            // Appel direct au nomenclature-service (pas via gateway pour éviter auth circulaire)
            String url = nomenclatureUrl + "/priorites-activite/" + prioriteId;
            Map<String, Object> priorite = restTemplate.getForObject(url, Map.class);
            if (priorite != null) prioritesCache.put(prioriteId, priorite);
            return priorite;
        } catch (Exception e) {
            log.warn("Impossible de charger la priorité {}: {}", prioriteId, e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private void refreshPrioritesCache() {
        try {
            String url = nomenclatureUrl + "/priorites-activite/actives";
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {});
            if (response.getBody() != null) {
                response.getBody().forEach(p -> {
                    Object idObj = p.get("id");
                    if (idObj != null) prioritesCache.put(Long.valueOf(idObj.toString()), p);
                });
            }
        } catch (Exception e) {
            log.warn("Impossible de recharger le cache priorités: {}", e.getMessage());
        }
    }

    // ── Création ─────────────────────────────────────────────────────────────

    @Transactional
    public Activité create(Activité activite, Long utilisateurId, List<Long> groupeIds,  List<Long> utilisateurIds) {
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
        if (utilisateurIds != null && !utilisateurIds.isEmpty()) {
            List<Utilisateur> utilisateurs = utilisateurRepo.findAllById(utilisateurIds);
            activite.setUtilisateurs(new ArrayList<>(utilisateurs));
        }

        Activité saved = activiteRepo.save(activite);
        try {
            saved.getProjets().forEach(p -> avancementService.recalculerProjet(p.getId()));
        } catch (Exception ignored) {}
        return saved;

    }

    // ── Mise à jour ───────────────────────────────────────────────────────────

    @Transactional
    public Activité update(Long id, Activité details, Long utilisateurId, List<Long> groupeIds,List<Long> utilisateurIds ) {
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
        // ── PRIORITÉ : setter prioriteId au lieu de priorite ──
        existing.setPrioriteId(details.getPrioriteId());
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

        if (utilisateurIds != null) {
            existing.setUtilisateurs(utilisateurIds.isEmpty()
                    ? new ArrayList<>()
                    : new ArrayList<>(utilisateurRepo.findAllById(utilisateurIds)));
        }
        Activité saved = activiteRepo.save(existing);

        try {
            saved.getProjets().forEach(p -> avancementService.recalculerProjet(p.getId()));
        } catch (Exception ignored) {}
        return saved;

    }

    // ── Suppression ───────────────────────────────────────────────────────────

    @Transactional
    public void delete(Long id) {
        Activité activite = activiteRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité non trouvée: " + id));
        log.info("🗑️ Suppression activité id={} '{}'", id, activite.getNom());
        try {
            int nb = commentaireRepository.deleteByActiviteId(id);
            log.debug("  → {} commentaire(s) supprimé(s)", nb);
        } catch (Exception e) { log.warn("  ⚠️ Commentaires: {}", e.getMessage()); }
        try {
            activite.getGroupes().clear();
            activiteRepo.save(activite);
        } catch (Exception e) { log.warn("  ⚠️ Groupes: {}", e.getMessage()); }
        activiteRepo.deleteById(id);
        log.info("  ✅ Activité id={} supprimée", id);
    }

    @Transactional
    public Activité changerStatut(Long activiteId, Long nouveauStatutId) {
        Activité a = getById(activiteId);
        if (nouveauStatutId != null) a.setStatutActiviteId(nouveauStatutId);
        return activiteRepo.save(a);
    }

    public void clearStatutsCache()   { statutsCache.clear(); }
    public void clearPrioritesCache() { prioritesCache.clear(); }
}