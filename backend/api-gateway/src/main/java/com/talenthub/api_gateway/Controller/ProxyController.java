package com.talenthub.api_gateway.Controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
public class ProxyController {

    private final RestTemplate restTemplate;

    public ProxyController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // ✅ proxy multipart GÉNÉRIQUE, gère tout endpoint d'upload
    // (fichiers ET champs texte associés), quel que soit leur nom
    @PostMapping(value = "/api/application/**", consumes = "multipart/form-data")
    public ResponseEntity<byte[]> proxyMultipartApplication(HttpServletRequest request,
                                                            MultipartHttpServletRequest multipartRequest) {
        String path = request.getRequestURI().replaceFirst("/api/application", "");
        String targetUrl = "http://application-service" + path;
        return forwardMultipart(targetUrl, request, multipartRequest);
    }

    @PostMapping(value = "/api/nomenclature/**", consumes = "multipart/form-data")
    public ResponseEntity<byte[]> proxyMultipartNomenclature(HttpServletRequest request,
                                                             MultipartHttpServletRequest multipartRequest) {
        String path = request.getRequestURI().replaceFirst("/api/nomenclature", "");
        String targetUrl = "http://nomenclature-service" + path;
        return forwardMultipart(targetUrl, request, multipartRequest);
    }

    // ✅ Logique commune — reconstruit un multipart identique (fichiers + champs texte)
    private ResponseEntity<byte[]> forwardMultipart(String targetUrl, HttpServletRequest request,
                                                    MultipartHttpServletRequest multipartRequest) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            // Recopie tous les fichiers, quel que soit leur nom de champ
            Map<String, List<MultipartFile>> fileMap = multipartRequest.getMultiFileMap();
            for (Map.Entry<String, List<MultipartFile>> entry : fileMap.entrySet()) {
                for (MultipartFile file : entry.getValue()) {
                    ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                        @Override
                        public String getFilename() {
                            return file.getOriginalFilename();
                        }
                    };
                    body.add(entry.getKey(), resource);
                }
            }

            // Recopie tous les champs texte (utilisateurId, projetId, description, etc.)
            multipartRequest.getParameterMap().forEach((key, values) -> {
                for (String value : values) {
                    body.add(key, value);
                }
            });

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null) headers.set("Authorization", authHeader);

            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<byte[]> response = restTemplate.exchange(targetUrl, HttpMethod.POST, entity, byte[].class);
            return buildCleanResponse(response);
        } catch (IOException e) {
            return ResponseEntity.status(500).body(("Erreur upload proxy: " + e.getMessage()).getBytes());
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            return buildErrorResponse(e);
        }
    }

    // ── Routes JSON classiques ──

    @RequestMapping(value = "/api/application/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH})
    public ResponseEntity<byte[]> proxyApplicationService(HttpServletRequest request,
                                                          @RequestBody(required = false) byte[] body) {
        String path = request.getRequestURI().replaceFirst("/api/application", "");
        String query = request.getQueryString() != null ? "?" + request.getQueryString() : "";
        String targetUrl = "http://application-service" + path + query;

        HttpHeaders headers = new HttpHeaders();
        java.util.Collections.list(request.getHeaderNames())
                .forEach(h -> headers.add(h, request.getHeader(h)));

        HttpMethod method = HttpMethod.valueOf(request.getMethod());
        HttpEntity<byte[]> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(targetUrl, method, entity, byte[].class);
            return buildCleanResponse(response);
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            return buildErrorResponse(e);
        }
    }

    @RequestMapping(value = "/api/nomenclature/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH})
    public ResponseEntity<byte[]> proxyNomenclatureService(HttpServletRequest request,
                                                           @RequestBody(required = false) byte[] body) {
        String path = request.getRequestURI().replaceFirst("/api/nomenclature", "");
        String query = request.getQueryString() != null ? "?" + request.getQueryString() : "";
        String targetUrl = "http://nomenclature-service" + path + query;

        HttpHeaders headers = new HttpHeaders();
        java.util.Collections.list(request.getHeaderNames())
                .forEach(h -> headers.add(h, request.getHeader(h)));

        HttpMethod method = HttpMethod.valueOf(request.getMethod());
        HttpEntity<byte[]> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(targetUrl, method, entity, byte[].class);
            return buildCleanResponse(response);
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            return buildErrorResponse(e);
        }
    }

    // ✅ NOUVEAU — filtre les en-têtes "hop-by-hop" sur les réponses RÉUSSIES
    // (Transfer-Encoding, Content-Length, Connection) qui causent des
    // doublons d'en-têtes une fois que Spring MVC reconstruit la réponse
    private ResponseEntity<byte[]> buildCleanResponse(ResponseEntity<byte[]> response) {
        HttpHeaders cleanHeaders = new HttpHeaders();
        response.getHeaders().forEach((key, values) -> {
            String k = key.toLowerCase();
            if (!k.equals("transfer-encoding") && !k.equals("content-length") && !k.equals("connection")) {
                cleanHeaders.put(key, values);
            }
        });
        return ResponseEntity.status(response.getStatusCode())
                .headers(cleanHeaders)
                .body(response.getBody());
    }

    private ResponseEntity<byte[]> buildErrorResponse(org.springframework.web.client.HttpStatusCodeException e) {
        HttpHeaders cleanHeaders = new HttpHeaders();
        if (e.getResponseHeaders() != null) {
            e.getResponseHeaders().forEach((key, values) -> {
                String k = key.toLowerCase();
                if (!k.equals("content-length") && !k.equals("transfer-encoding") && !k.equals("connection")) {
                    cleanHeaders.put(key, values);
                }
            });
        }
        return ResponseEntity.status(e.getStatusCode())
                .headers(cleanHeaders)
                .body(e.getResponseBodyAsByteArray());
    }
}