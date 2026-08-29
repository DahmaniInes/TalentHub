package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.JourFerieDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
public class JourFerieService {

    private final RestTemplate restTemplate;

    public JourFerieService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);
        this.restTemplate = new RestTemplate(factory);
    }

    // ✅ Cache appliqué ici, sur une méthode qui retourne un type simple
    // (List<JourFerieDTO>), jamais un ResponseEntity — évite le problème
    // de sérialisation Redis qui causait le 500 silencieux.
    @Cacheable(value = "jours-feries", key = "#annee")
    public List<JourFerieDTO> getJoursFeries(int annee) {
        String url = "https://date.nager.at/api/v3/PublicHolidays/" + annee + "/TN";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            headers.setAcceptCharset(List.of(StandardCharsets.UTF_8));

            JourFerieDTO[] result = restTemplate.getForObject(url, JourFerieDTO[].class);
            log.info("Jours fériés {} récupérés avec succès ({} entrées)", annee, result != null ? result.length : 0);
            return result != null ? Arrays.asList(result) : List.of();

        } catch (ResourceAccessException e) {
            Throwable cause = e.getCause();
            if (cause instanceof UnknownHostException) {
                log.error("[JOURS-FERIES] Impossible de résoudre date.nager.at : {}", e.getMessage());
            } else {
                log.error("[JOURS-FERIES] Erreur réseau pour l'année {} : {}", annee, e.getMessage());
            }
            return List.of();

        } catch (HttpClientErrorException e) {
            log.error("[JOURS-FERIES] Nager.Date a répondu {} pour l'année {} : {}", e.getStatusCode(), annee, e.getResponseBodyAsString());
            return List.of();

        } catch (Exception e) {
            log.error("[JOURS-FERIES] Erreur inattendue ({}) pour l'année {} : {}", e.getClass().getName(), annee, e.getMessage(), e);
            return List.of();
        }
    }
}