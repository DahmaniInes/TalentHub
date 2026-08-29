package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Demande;
import com.talenthub.application_service.Entity.SoldeCongeReport;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.DTO.SoldeCongeDTO;
import com.talenthub.application_service.Repository.DemandeRepository;
import com.talenthub.application_service.Repository.SoldeCongeReportRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@Transactional
public class CongeService {

    private final UtilisateurRepository utilisateurRepository;
    private final DemandeRepository demandeRepository;
    private final SoldeCongeReportRepository reportRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${nomenclature.base-url:http://localhost:8085/api/nomenclature}")
    private String nomenclatureBaseUrl;

    public CongeService(UtilisateurRepository utilisateurRepository,
                        DemandeRepository demandeRepository,
                        SoldeCongeReportRepository reportRepository) {
        this.utilisateurRepository = utilisateurRepository;
        this.demandeRepository = demandeRepository;
        this.reportRepository = reportRepository;
    }

    /**
     * ✅ Récupère le token JWT brut de la requête entrante en cours, pour le
     * réinjecter dans les appels sortants vers le Gateway (qui exige une
     * authentification sur toutes les routes). Sans ça, RestTemplate envoie
     * une requête anonyme et se prend un 401 → listes vides en silence.
     */
    private HttpHeaders headersAvecToken() {
        HttpHeaders headers = new HttpHeaders();
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = (Jwt) jwtAuth.getPrincipal();
            headers.setBearerAuth(jwt.getTokenValue());
        } else {
            log.warn("[CongeService] Aucun JWT dans le contexte — appel Gateway probablement rejeté (401)");
        }
        return headers;
    }

    private double getTauxMensuel() {
        try {
            HttpEntity<Void> entity = new HttpEntity<>(headersAvecToken());
            Map<?, ?> body = restTemplate.exchange(
                    nomenclatureBaseUrl + "/parametres-conge/actuel",
                    HttpMethod.GET, entity, Map.class
            ).getBody();
            Object v = body != null ? body.get("tauxMensuel") : null;
            return v != null ? Double.parseDouble(v.toString()) : 1.8;
        } catch (Exception e) {
            log.warn("Impossible de récupérer le taux de congé, valeur par défaut 1.8 utilisée: {}", e.getMessage());
            return 1.8;
        }
    }

    @SuppressWarnings("unchecked")
    private List<Long> getTypeCongeIds() {
        try {
            HttpEntity<Void> entity = new HttpEntity<>(headersAvecToken());
            List<Map<String, Object>> types = restTemplate.exchange(
                    nomenclatureBaseUrl + "/types-demande",
                    HttpMethod.GET, entity, List.class
            ).getBody();
            return types.stream()
                    .filter(t -> Boolean.TRUE.equals(t.get("estConge")))
                    .map(t -> Long.valueOf(t.get("id").toString()))
                    .toList();
        } catch (Exception e) {
            log.warn("Impossible de récupérer les types congé: {}", e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private Long getStatutAccepteeId() {
        try {
            HttpEntity<Void> entity = new HttpEntity<>(headersAvecToken());
            List<Map<String, Object>> statuts = restTemplate.exchange(
                    nomenclatureBaseUrl + "/statuts-demande",
                    HttpMethod.GET, entity, List.class
            ).getBody();
            return statuts.stream()
                    .filter(s -> "ACCEPTEE".equals(s.get("code")))
                    .map(s -> Long.valueOf(s.get("id").toString()))
                    .findFirst().orElse(null);
        } catch (Exception e) {
            log.warn("Impossible de récupérer le statut ACCEPTEE: {}", e.getMessage());
            return null;
        }
    }

    private double calculerMoisEcoules(LocalDate dateEmbauche, int annee) {
        LocalDate debutAnnee = LocalDate.of(annee, 1, 1);
        LocalDate debutCompte = dateEmbauche.isAfter(debutAnnee) ? dateEmbauche : debutAnnee;
        LocalDate aujourdHui = LocalDate.now();
        if (debutCompte.getYear() != annee || debutCompte.isAfter(aujourdHui)) return 0;
        int mois = (aujourdHui.getYear() - debutCompte.getYear()) * 12
                + (aujourdHui.getMonthValue() - debutCompte.getMonthValue());
        return Math.max(0, Math.min(12, mois));
    }

    public SoldeCongeDTO calculerSolde(Long utilisateurId) {
        Utilisateur u = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé: " + utilisateurId));

        int annee = LocalDate.now().getYear();
        double taux = getTauxMensuel();
        double moisEcoules = calculerMoisEcoules(u.getDateEmbauche(), annee);
        double acquis = moisEcoules * taux;

        double report = reportRepository.findByUtilisateurIdAndAnnee(utilisateurId, annee)
                .map(SoldeCongeReport::getJoursReport).orElse(0.0);

        List<Long> typeCongeIds = getTypeCongeIds();
        Long statutAccepteeId = getStatutAccepteeId();

        double pris = 0;
        if (!typeCongeIds.isEmpty() && statutAccepteeId != null) {
            List<Demande> demandes = demandeRepository.findByUtilisateurId(utilisateurId);
            pris = demandes.stream()
                    .filter(d -> typeCongeIds.contains(d.getTypeDemandeId()))
                    .filter(d -> statutAccepteeId.equals(d.getStatutDemandeId()))
                    .filter(d -> d.getDateDebut() != null && d.getDateDebut().getYear() == annee)
                    .mapToDouble(d -> d.getNbJours() != null ? d.getNbJours() : 0)
                    .sum();
        }

        double solde = report + acquis - pris;

        return SoldeCongeDTO.builder()
                .tauxMensuel(taux).moisEcoules(moisEcoules).acquis(acquis)
                .report(report).pris(pris).solde(solde).annee(annee)
                .build();
    }

    public void setReport(Long utilisateurId, int annee, double joursReport) {
        SoldeCongeReport r = reportRepository.findByUtilisateurIdAndAnnee(utilisateurId, annee)
                .orElse(SoldeCongeReport.builder().utilisateurId(utilisateurId).annee(annee).build());
        r.setJoursReport(joursReport);
        reportRepository.save(r);
    }


    /** ✅ NOUVEAU — permet à DemandeService de savoir si ce type de demande
     * doit être contrôlé par rapport au solde de congé disponible. */
    public boolean estTypeConge(Long typeDemandeId) {
        return getTypeCongeIds().contains(typeDemandeId);
    }
}