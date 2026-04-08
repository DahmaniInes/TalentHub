package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Notification;
import com.talenthub.application_service.Enum.NotificationType;
import com.talenthub.application_service.Repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    // ✅ Aucun appel DB — pool Hikari préservé
    public SseEmitter subscribe(String keycloakId) {
        SseEmitter existing = emitters.remove(keycloakId);
        if (existing != null) {
            existing.complete();
        }

        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.put(keycloakId, emitter);

        emitter.onCompletion(() -> emitters.remove(keycloakId));
        emitter.onTimeout(() -> {
            emitters.remove(keycloakId);
            emitter.complete();
        });
        emitter.onError(e -> emitters.remove(keycloakId));

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            emitters.remove(keycloakId);
            emitter.completeWithError(e);
        }

        return emitter;
    }

    @Transactional
    public Notification creer(String destinataireId, NotificationType type,
                              String titre, String description,
                              String lien, Long ressourceId) {
        Notification notif = Notification.builder()
                .destinataireId(destinataireId)
                .type(type.name())          // ✅ String en DB
                .titre(titre)
                .description(description)
                .lien(lien)
                .ressourceId(ressourceId)
                .lu(false)
                .dateCreation(LocalDateTime.now())
                .build();

        Notification saved = notificationRepository.save(notif);
        pushToUser(destinataireId, saved);
        return saved;
    }

    private void pushToUser(String keycloakId, Notification notif) {
        SseEmitter emitter = emitters.get(keycloakId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(notif));
            } catch (IOException e) {
                emitters.remove(keycloakId);
                emitter.completeWithError(e);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<Notification> getAll(String keycloakId) {
        return notificationRepository.findByDestinataireIdOrderByDateCreationDesc(keycloakId);
    }

    @Transactional(readOnly = true)
    public long countUnread(String keycloakId) {
        return notificationRepository.countByDestinataireIdAndLuFalse(keycloakId);
    }

    @Transactional
    public Notification marquerLu(Long id) {
        Notification notif = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification non trouvée: " + id));
        notif.setLu(true);
        return notificationRepository.save(notif);
    }

    @Transactional
    public void marquerTousLus(String keycloakId) {
        notificationRepository.markAllAsRead(keycloakId);
    }

    @Transactional
    public void supprimer(Long id) {
        notificationRepository.deleteById(id);
    }

    @Transactional
    public void supprimerToutes(String keycloakId) {
        notificationRepository.deleteByDestinataireId(keycloakId);
    }
}