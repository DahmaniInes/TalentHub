package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.NotificationDTO;
import com.talenthub.application_service.Service.NotificationService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    // ✅ SSE — s'abonner aux notifications temps réel
    @GetMapping(value = "/sse/{keycloakId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@PathVariable String keycloakId) {
        return service.subscribe(keycloakId);
    }

    // ✅ Toutes les notifications d'un utilisateur
    @GetMapping("/{keycloakId}")
    public ResponseEntity<List<NotificationDTO>> getAll(@PathVariable String keycloakId) {
        return ResponseEntity.ok(
                service.getAll(keycloakId).stream().map(NotificationDTO::new).toList()
        );
    }

    // ✅ Nombre de non-lues
    @GetMapping("/{keycloakId}/unread-count")
    public ResponseEntity<Long> countUnread(@PathVariable String keycloakId) {
        return ResponseEntity.ok(service.countUnread(keycloakId));
    }

    // ✅ Marquer une notification comme lue
    @PatchMapping("/{id}/lu")
    public ResponseEntity<NotificationDTO> marquerLu(@PathVariable Long id) {
        return ResponseEntity.ok(new NotificationDTO(service.marquerLu(id)));
    }

    // ✅ Marquer toutes comme lues
    @PatchMapping("/{keycloakId}/tout-lire")
    public ResponseEntity<Void> marquerTousLus(@PathVariable String keycloakId) {
        service.marquerTousLus(keycloakId);
        return ResponseEntity.noContent().build();
    }

    // ✅ Supprimer une notification
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        service.supprimer(id);
        return ResponseEntity.noContent().build();
    }

    // ✅ Supprimer toutes
    @DeleteMapping("/{keycloakId}/toutes")
    public ResponseEntity<Void> supprimerToutes(@PathVariable String keycloakId) {
        service.supprimerToutes(keycloakId);
        return ResponseEntity.noContent().build();
    }
}