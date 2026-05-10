// api-gateway/.../Service/PermissionCacheService.java — REMPLACE
package com.talenthub.api_gateway.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
public class PermissionCacheService {

    private final StringRedisTemplate redis;
    private final RestTemplate        restTemplate;

    @Value("${permissions.loader-url}")
    private String loaderUrl;

    @Value("${permissions.cache-ttl-minutes:60}")
    private int cacheTtlMinutes;

    public PermissionCacheService(StringRedisTemplate redis) {
        this.redis        = redis;
        this.restTemplate = new RestTemplate();
    }

    // ✅ Méthode principale — prend le token en paramètre
    public String getPermissionsAsHeader(Long profilId, String bearerToken) {
        String key = "perms:profil:" + profilId;

        // 1. Chercher dans Redis
        try {
            String cached = redis.opsForValue().get(key);
            if (cached != null && !cached.isBlank()) {
                System.out.println("[Gateway Cache] HIT Redis profilId=" + profilId);
                return cached;
            }
        } catch (Exception e) {
            System.err.println("[Gateway Cache] Redis erreur: " + e.getMessage());
        }

        // 2. Cache miss → appel HTTP avec token
        List<String> codes = loadFromService(profilId, bearerToken);
        System.out.println("[Gateway Cache] Codes chargés: " + codes);

        String value = String.join(",", codes);

        // 3. Mettre en cache si non vide
        if (!value.isBlank()) {
            try {
                redis.opsForValue().set(key, value, Duration.ofMinutes(cacheTtlMinutes));
                System.out.println("[Gateway Cache] Mis en cache Redis: '" + value + "'");
            } catch (Exception e) {
                System.err.println("[Gateway Cache] Redis set erreur: " + e.getMessage());
            }
        }

        return value;
    }

    public void evict(Long profilId) {
        try {
            redis.delete("perms:profil:" + profilId);
        } catch (Exception e) {
            System.err.println("[Gateway Cache] Evict erreur: " + e.getMessage());
        }
    }

    private List<String> loadFromService(Long profilId, String bearerToken) {
        try {
            String url = loaderUrl.replace("{profilId}", String.valueOf(profilId));
            System.out.println("[Gateway Cache] Appel: " + url);

            // ✅ Passer le token dans les headers
            HttpHeaders headers = new HttpHeaders();
            if (bearerToken != null && !bearerToken.isBlank()) {
                headers.set("Authorization", "Bearer " + bearerToken);
            }
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String[]> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, String[].class);

            String[] result = response.getBody();
            System.out.println("[Gateway Cache] Réponse: "
                    + (result != null ? Arrays.toString(result) : "null"));

            return result != null ? Arrays.asList(result) : Collections.emptyList();

        } catch (Exception e) {
            System.err.println("[Gateway Cache] Erreur: "
                    + e.getClass().getSimpleName() + " - " + e.getMessage());
            return Collections.emptyList();
        }
    }
}