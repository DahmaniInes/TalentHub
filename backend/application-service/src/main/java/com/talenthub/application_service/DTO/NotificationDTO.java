package com.talenthub.application_service.DTO;

import com.talenthub.application_service.Entity.Notification;
import jakarta.persistence.Column;

import java.time.LocalDateTime;

public class NotificationDTO {

    public Long id;
    public String destinataireId;
    public String type;          // ✅ String — compatible Angular et tous modules
    public String titre;
    public String description;
    public String lien;
    public Long ressourceId;
    public boolean lu;
    public LocalDateTime dateCreation;

    public NotificationDTO(Notification n) {

        this.id             = n.getId();
        this.destinataireId = n.getDestinataireId();
        this.type           = n.getType();   // ✅ Déjà String
        this.titre          = n.getTitre();
        this.description    = n.getDescription();
        this.lien           = n.getLien();
        this.ressourceId    = n.getRessourceId();
        this.lu             = n.isLu();
        this.dateCreation   = n.getDateCreation();
    }
}