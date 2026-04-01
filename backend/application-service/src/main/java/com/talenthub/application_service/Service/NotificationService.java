package com.talenthub.application_service.Service;


import com.talenthub.application_service.Entity.Notification;
import com.talenthub.application_service.Repository.NotificationRepository;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
// 10. NotificationService.java
@Service
@Transactional
public class NotificationService {

    private final NotificationRepository repository;

    public NotificationService(NotificationRepository repository) {
        this.repository = repository;
    }

    public List<Notification> getAllNotifications() {
        return repository.findAll();
    }

    public List<Notification> getNotificationsNonLuesByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurIdAndLueFalse(utilisateurId);
    }

    public Optional<Notification> getNotificationById(Long id) {
        return repository.findById(id);
    }

    public Notification createNotification(Notification notification) {
        return repository.save(notification);
    }

    public Notification marquerCommeLue(Long id) {
        Notification notif = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification non trouvée avec id: " + id));
        notif.marquerCommeLue();
        return repository.save(notif);
    }

    public void deleteNotification(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Notification non trouvée avec id: " + id);
        }
        repository.deleteById(id);
    }
}
