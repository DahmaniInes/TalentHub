package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "solde_conge_report", uniqueConstraints = @UniqueConstraint(columnNames = {"utilisateur_id", "annee"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SoldeCongeReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "utilisateur_id", nullable = false)
    private Long utilisateurId;

    @Column(nullable = false)
    private Integer annee;

    // Jours reportés de l'année précédente — saisi manuellement par l'admin,
    // une fois par an. Jamais le "solde" final n'est stocké/modifié directement.
    @Column(name = "jours_report", nullable = false)
    @Builder.Default
    private Double joursReport = 0.0;
}