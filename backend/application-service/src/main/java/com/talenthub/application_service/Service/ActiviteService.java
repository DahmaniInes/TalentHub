// Service/ActiviteService.java — REMPLACE COMPLET
package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.ActiviteDTO;
import com.talenthub.application_service.Entity.Activité;
import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.Projet;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActiviteService {
    private final AvancementService avancementService;
    private final ActiviteRepository    activiteRepo;
    private final UtilisateurRepository utilisateurRepo;
    private final ProjetRepository      projetRepo;
    private final RestTemplate          restTemplate;
    private final GroupeRepository      groupeRepo;
    private final CommentaireRepository commentaireRepository;
    private final DocumentRepository    documentRepo;
    private final LigneFeuilleTempsRepository ligneFeuilleTempsRepo;
    private final EvaluationActiviteRepository evaluationActiviteRepo;
    @Value("${nomenclature.service.url:http://localhost:8083/api}")
    private String nomenclatureUrl;

    private final Map<Long, Map<String, Object>> statutsCache   = new ConcurrentHashMap<>();
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

    // ════════════════════════════════════════════════════════════
    // ✅ NOUVEAU — Vérification serveur de autoriserActivitesGlobales.
    //
    // Retourne la liste des activités globales à proposer pour CE projet
    // précis : liste vide si le projet n'autorise pas les activités
    // globales (autoriserActivitesGlobales=false), liste complète des
    // activités globales sinon.
    //
    // Avant ce correctif, cette règle était vérifiée uniquement côté
    // frontend (ma-semaine.component.ts) — un appel direct à l'API pouvait
    // donc contourner la restriction. Désormais le frontend n'a plus à
    // connaître cette règle : il appelle cet endpoint et affiche ce qu'il
    // reçoit.
    // ════════════════════════════════════════════════════════════
    @Transactional(readOnly = true)
    public List<ActiviteDTO> getGlobalesDisponiblesPourProjet(Long projetId) {
        Projet projet = projetRepo.findById(projetId)
                .orElseThrow(() -> new ResourceNotFoundException("Projet non trouvé: " + projetId));
        if (!projet.isAutoriserActivitesGlobales()) {
            return List.of();
        }
        return getGlobales();
    }

    // ── Enrichissement DTO ───────────────────────────────────────────────────

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

        if (a.getPrioriteId() != null) {
            Map<String, Object> priorite = getPrioriteFromCacheOrFetch(a.getPrioriteId());
            if (priorite != null) {
                dto.setPrioriteLibelle(String.valueOf(priorite.getOrDefault("libelle", "—")));
                dto.setPrioriteCouleur(String.valueOf(priorite.getOrDefault("couleur", "#94a3b8")));
                dto.setPrioriteCode(String.valueOf(priorite.getOrDefault("code", "")));
            }
        }

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

        // ✅ AJOUT — Supprimer les évaluations avant l'activité pour
        // éviter la violation de contrainte FK evaluations_activite.activite_id
        try {
            evaluationActiviteRepo.deleteByActiviteId(id);
            log.debug("  → évaluations supprimées pour activité {}", id);
        } catch (Exception e) {
            log.warn("  ⚠️ Évaluations: {}", e.getMessage());
        }

        try {
            Set<Long> feuillesImpactees = new HashSet<>(
                    ligneFeuilleTempsRepo.findDistinctFeuilleTempsIdsByActiviteId(id));
            ligneFeuilleTempsRepo.deleteByActiviteId(id);
            log.debug("  → lignes de feuille de temps supprimées (feuilles impactées: {})",
                    feuillesImpactees.size());
        } catch (Exception e) {
            log.warn("  ⚠️ Lignes feuille de temps: {}", e.getMessage());
        }

        try {
            int nb = commentaireRepository.deleteByActiviteId(id);
            log.debug("  → {} commentaire(s) supprimé(s)", nb);
        } catch (Exception e) {
            log.warn("  ⚠️ Commentaires: {}", e.getMessage());
        }

        try {
            activite.getGroupes().clear();
            activiteRepo.save(activite);
        } catch (Exception e) {
            log.warn("  ⚠️ Groupes: {}", e.getMessage());
        }

        List<Long> projetIdsImpactes = activite.getProjets().stream().map(Projet::getId).toList();

        activiteRepo.deleteById(id);
        log.info("  ✅ Activité id={} supprimée", id);

        try {
            projetIdsImpactes.forEach(avancementService::recalculerProjet);
        } catch (Exception ignored) {}
    }



    @Transactional
    public Activité changerStatut(Long activiteId, Long nouveauStatutId) {
        Activité a = getById(activiteId);
        if (nouveauStatutId != null) a.setStatutActiviteId(nouveauStatutId);
        return activiteRepo.save(a);
    }

    public void clearStatutsCache()   { statutsCache.clear(); }
    public void clearPrioritesCache() { prioritesCache.clear(); }

    // ════════════════════════════════════════════════════════════
    // ✅ Mécanisme central du scénario B (duplication idempotente des
    // activités globales par projet).
    // ════════════════════════════════════════════════════════════
    @Transactional
    public synchronized Activité obtenirOuDupliquerPourProjet(Long activiteGlobaleId, Long projetId) {
        var copieExistante = activiteRepo.findBySourceGlobaleIdAndProjetId(activiteGlobaleId, projetId);
        if (copieExistante.isPresent()) {
            log.debug("♻️ Copie existante réutilisée pour activité globale {} / projet {}",
                    activiteGlobaleId, projetId);
            return copieExistante.get();
        }

        Activité source = activiteRepo.findById(activiteGlobaleId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Activité globale non trouvée: " + activiteGlobaleId));

        if (!source.isEstGlobale()) {
            throw new IllegalArgumentException(
                    "L'activité " + activiteGlobaleId + " n'est pas une activité globale.");
        }

        Projet projet = projetRepo.findById(projetId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Projet non trouvé: " + projetId));

        // ✅ Garde-fou cohérent avec la demande B : on ne crée pas de copie
        // si le projet n'autorise pas les activités globales (même si
        // l'appel arrive directement sur cet endpoint, sans passer par le
        // dropdown qui ne les propose normalement pas dans ce cas).
        if (!projet.isAutoriserActivitesGlobales()) {
            throw new IllegalArgumentException(
                    "Le projet " + projetId + " n'autorise pas les activités globales.");
        }

        Activité copie = new Activité();
        copie.setNom(source.getNom());
        copie.setDescription(source.getDescription());
        copie.setCouleur(source.getCouleur());
        copie.setPrioriteId(source.getPrioriteId());
        copie.setHeuresEstimees(source.getHeuresEstimees());
        copie.setVisible(source.isVisible());
        copie.setFacturable(source.isFacturable());
        copie.setStatutActiviteId(1L);
        copie.setEstGlobale(false);
        copie.setActiviteSourceGlobaleId(activiteGlobaleId);

        long count = activiteRepo.count() + 1;
        copie.setNumeroActivite(String.format("ACT-%03d", count));

        Activité saved = activiteRepo.save(copie);

        projet.getActivites().add(saved);
        projetRepo.save(projet);

        log.info("➕ Copie créée pour activité globale {} → projet {} (nouvelle activité id={})",
                activiteGlobaleId, projetId, saved.getId());

        try {
            avancementService.recalculerProjet(projetId);
        } catch (Exception ignored) {}

        return saved;
    }
}