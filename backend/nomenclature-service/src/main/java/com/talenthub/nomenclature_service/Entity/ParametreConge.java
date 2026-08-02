package com.talenthub.nomenclature_service.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "parametre_conge")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ParametreConge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Jours acquis par mois travaillé (ex: 1.8, 1.5, 2.08)
    @Column(name = "taux_mensuel", nullable = false)
    private Double tauxMensuel;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist @PreUpdate
    protected void onSave() { this.updatedAt = LocalDateTime.now(); }
}