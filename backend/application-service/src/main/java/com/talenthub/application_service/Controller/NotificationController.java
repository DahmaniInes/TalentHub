package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.NotificationDTO;
import com.talenthub.application_service.Service.NotificationService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService service;
    private final JwtDecoder          jwtDecoder;  // ← AJOUTE

    public NotificationController(NotificationService service,
                                  JwtDecoder jwtDecoder) {    // ← AJOUTE
        this.service    = service;
        this.jwtDecoder = jwtDecoder;
    }

    /**
     * ✅ SSE avec token en query param car EventSource ne supporte pas les headers.
     * URL : /notifications/sse/{keycloakId}?token=eyJ...
     */
    @GetMapping(value = "/sse/{keycloakId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(
            @PathVariable String keycloakId,
            @RequestParam(value = "token", required = false) String token) {

        // Valider le token manuellement
        if (token == null || token.isBlank()) {
            SseEmitter emitter = new SseEmitter(0L);
            emitter.completeWithError(new SecurityException("Token manquant"));
            return emitter;
        }

        try {
            Jwt jwt = jwtDecoder.decode(token);
            // Vérifier que le keycloakId du token correspond
            String subject = jwt.getSubject();
            if (!keycloakId.equals(subject)) {
                SseEmitter emitter = new SseEmitter(0L);
                emitter.completeWithError(new SecurityException("Token invalide"));
                return emitter;
            }
        } catch (JwtException e) {
            SseEmitter emitter = new SseEmitter(0L);
            emitter.completeWithError(new SecurityException("Token invalide: " + e.getMessage()));
            return emitter;
        }

        return service.subscribe(keycloakId);
    }

    @GetMapping("/{keycloakId}")
    public ResponseEntity<List<NotificationDTO>> getAll(@PathVariable String keycloakId) {
        return ResponseEntity.ok(
                service.getAll(keycloakId).stream().map(NotificationDTO::new).toList());
    }

    @GetMapping("/{keycloakId}/unread-count")
    public ResponseEntity<Long> countUnread(@PathVariable String keycloakId) {
        return ResponseEntity.ok(service.countUnread(keycloakId));
    }

    @PatchMapping("/{id}/lu")
    public ResponseEntity<NotificationDTO> marquerLu(@PathVariable Long id) {
        return ResponseEntity.ok(new NotificationDTO(service.marquerLu(id)));
    }

    @PatchMapping("/{keycloakId}/tout-lire")
    public ResponseEntity<Void> marquerTousLus(@PathVariable String keycloakId) {
        service.marquerTousLus(keycloakId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        service.supprimer(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{keycloakId}/toutes")
    public ResponseEntity<Void> supprimerToutes(@PathVariable String keycloakId) {
        service.supprimerToutes(keycloakId);
        return ResponseEntity.noContent().build();
    }
}