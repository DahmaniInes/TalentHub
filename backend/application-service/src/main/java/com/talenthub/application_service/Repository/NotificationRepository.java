package com.talenthub.application_service.Repository;

import com.talenthub.application_service.Entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByDestinataireIdOrderByDateCreationDesc(String destinataireId);

    List<Notification> findByDestinataireIdAndLuFalseOrderByDateCreationDesc(String destinataireId);

    long countByDestinataireIdAndLuFalse(String destinataireId);

    // ✅ @Param obligatoire avec @Query JPQL
    @Modifying
    @Query("UPDATE Notification n SET n.lu = true WHERE n.destinataireId = :destId")
    void markAllAsRead(@Param("destId") String destId);

    // ✅ Ajouté — utilisé par supprimerToutes()
    void deleteByDestinataireId(String destinataireId);
}