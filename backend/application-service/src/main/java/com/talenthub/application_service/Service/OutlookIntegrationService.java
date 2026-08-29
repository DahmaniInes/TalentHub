package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.OutlookConnexion;
import com.talenthub.application_service.Repository.OutlookConnexionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
public class OutlookIntegrationService {

    @Value("${outlook.client-id}")     private String clientId;
    @Value("${outlook.client-secret}") private String clientSecret;
    @Value("${outlook.tenant-id}")     private String tenantId;
    @Value("${outlook.redirect-uri}")  private String redirectUri;

    private final OutlookConnexionRepository connexionRepo;
    private final RestTemplate restTemplate = new RestTemplate();

    public OutlookIntegrationService(OutlookConnexionRepository connexionRepo) {
        this.connexionRepo = connexionRepo;
    }

    public String buildAuthorizationUrl(Long utilisateurId) {
        return "https://login.microsoftonline.com/" + tenantId + "/oauth2/v2.0/authorize"
                + "?client_id=" + clientId
                + "&response_type=code"
                + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
                + "&response_mode=query"
                + "&scope=" + URLEncoder.encode("Calendars.ReadWrite offline_access User.Read", StandardCharsets.UTF_8)
                + "&state=" + utilisateurId;
    }

    public void handleCallback(String code, Long utilisateurId) {
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("code", code);
        body.add("redirect_uri", redirectUri);
        body.add("grant_type", "authorization_code");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        Map<String, Object> resp = restTemplate.postForObject(
                "https://login.microsoftonline.com/" + tenantId + "/oauth2/v2.0/token",
                new HttpEntity<>(body, headers), Map.class);

        String accessToken  = (String) resp.get("access_token");
        String refreshToken = (String) resp.get("refresh_token");
        int expiresIn       = (int) resp.get("expires_in");

        OutlookConnexion conn = connexionRepo.findByUtilisateurId(utilisateurId)
                .orElse(OutlookConnexion.builder().utilisateurId(utilisateurId).build());
        conn.setAccessToken(accessToken);
        conn.setRefreshToken(refreshToken);
        conn.setExpiresAt(LocalDateTime.now().plusSeconds(expiresIn));
        conn.setConnectedAt(LocalDateTime.now());
        connexionRepo.save(conn);
    }

    /** Rafraîchit le token si expiré (marge de 2 min), retourne un token valide */
    public String getValidAccessToken(Long utilisateurId) {
        OutlookConnexion conn = connexionRepo.findByUtilisateurId(utilisateurId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non connecté à Outlook"));

        if (conn.getExpiresAt().isAfter(LocalDateTime.now().plusMinutes(2))) {
            return conn.getAccessToken();
        }

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("client_secret", clientSecret);
        body.add("refresh_token", conn.getRefreshToken());
        body.add("grant_type", "refresh_token");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        Map<String, Object> resp = restTemplate.postForObject(
                "https://login.microsoftonline.com/" + tenantId + "/oauth2/v2.0/token",
                new HttpEntity<>(body, headers), Map.class);

        conn.setAccessToken((String) resp.get("access_token"));
        conn.setExpiresAt(LocalDateTime.now().plusSeconds((int) resp.get("expires_in")));
        connexionRepo.save(conn);
        return conn.getAccessToken();
    }

    public boolean isConnected(Long utilisateurId) {
        return connexionRepo.findByUtilisateurId(utilisateurId).isPresent();
    }

    public void disconnect(Long utilisateurId) {
        connexionRepo.findByUtilisateurId(utilisateurId).ifPresent(connexionRepo::delete);
    }
}