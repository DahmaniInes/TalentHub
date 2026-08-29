package com.talenthub.application_service.Service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class OutlookSyncService {

    private final OutlookIntegrationService integrationService;
    private final RestTemplate restTemplate = new RestTemplate();

    public OutlookSyncService(OutlookIntegrationService integrationService) {
        this.integrationService = integrationService;
    }

    /**
     * Crée OU met à jour (si outlookEventId déjà présent) un événement.
     * Retourne l'ID Outlook de l'événement, à stocker sur la ligne/demande.
     */
    public String syncEvenement(Long utilisateurId, String outlookEventIdExistant,
                                String sujet, String description,
                                LocalDate date, String heureDebut, String heureFin,
                                String couleurCategorie) {
        if (!integrationService.isConnected(utilisateurId)) return null;

        try {
            String token = integrationService.getValidAccessToken(utilisateurId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = Map.of(
                    "subject", sujet,
                    "body", Map.of("contentType", "Text", "content", description != null ? description : ""),
                    "start", Map.of("dateTime", date + "T" + heureDebut + ":00", "timeZone", "Africa/Tunis"),
                    "end", Map.of("dateTime", date + "T" + heureFin + ":00", "timeZone", "Africa/Tunis"),
                    "categories", List.of("TalentHub"),
                    "showAs", "busy"
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            if (outlookEventIdExistant != null) {
                // Mise à jour
                restTemplate.exchange(
                        "https://graph.microsoft.com/v1.0/me/events/" + outlookEventIdExistant,
                        HttpMethod.PATCH, entity, String.class);
                return outlookEventIdExistant;
            } else {
                // Création
                Map<?, ?> resp = restTemplate.postForObject(
                        "https://graph.microsoft.com/v1.0/me/events", entity, Map.class);
                return (String) resp.get("id");
            }
        } catch (Exception e) {
            log.warn("[Outlook] Synchronisation échouée pour utilisateur {} : {}", utilisateurId, e.getMessage());
            return outlookEventIdExistant; // ne casse jamais le flux métier
        }
    }

    /** Événement "toute la journée" — pour les congés et jours fériés */
    public String syncEvenementToutJour(Long utilisateurId, String outlookEventIdExistant,
                                        String sujet, LocalDate dateDebut, LocalDate dateFinExclusive) {
        if (!integrationService.isConnected(utilisateurId)) return null;
        try {
            String token = integrationService.getValidAccessToken(utilisateurId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = Map.of(
                    "subject", sujet,
                    "isAllDay", true,
                    "start", Map.of("dateTime", dateDebut + "T00:00:00", "timeZone", "Africa/Tunis"),
                    "end", Map.of("dateTime", dateFinExclusive + "T00:00:00", "timeZone", "Africa/Tunis"),
                    "categories", List.of("TalentHub"),
                    "showAs", "oof"
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            if (outlookEventIdExistant != null) {
                restTemplate.exchange(
                        "https://graph.microsoft.com/v1.0/me/events/" + outlookEventIdExistant,
                        HttpMethod.PATCH, entity, String.class);
                return outlookEventIdExistant;
            } else {
                Map<?, ?> resp = restTemplate.postForObject(
                        "https://graph.microsoft.com/v1.0/me/events", entity, Map.class);
                return (String) resp.get("id");
            }
        } catch (Exception e) {
            log.warn("[Outlook] Sync congé échouée : {}", e.getMessage());
            return outlookEventIdExistant;
        }
    }

    public void supprimerEvenement(Long utilisateurId, String outlookEventId) {
        if (outlookEventId == null || !integrationService.isConnected(utilisateurId)) return;
        try {
            String token = integrationService.getValidAccessToken(utilisateurId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            restTemplate.exchange(
                    "https://graph.microsoft.com/v1.0/me/events/" + outlookEventId,
                    HttpMethod.DELETE, new HttpEntity<>(headers), Void.class);
        } catch (Exception e) {
            log.warn("[Outlook] Suppression échouée : {}", e.getMessage());
        }
    }
}