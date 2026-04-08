package com.talenthub.application_service.Entity;

import com.talenthub.application_service.Enum.NotificationType;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "destinataire_id", nullable = false)
    private String destinataireId;

    // ✅ Stocké en String en DB — compatible avec tous les modules
    @Column(name = "type", nullable = false)
    private String type;

    private String titre;
    private String description;
    private String lien;

    @Column(name = "ressource_id")
    private Long ressourceId;

    @Column(name = "lue", nullable = false)
    @Builder.Default
    private boolean lu = false;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation;

    // ✅ Getter/Setter enum pour usage Java — conversion String ↔ enum
    public NotificationType getTypeEnum() {
        try {
            return type != null ? NotificationType.valueOf(type) : null;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public void setTypeEnum(NotificationType notificationType) {
        this.type = notificationType != null ? notificationType.name() : null;
    }
}