package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "historique_utilisateurs", indexes = {
        @Index(name = "idx_hist_user_champ", columnList = "utilisateur_id, champ"),
        @Index(name = "idx_hist_user_dates", columnList = "utilisateur_id, date_debut, date_fin")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HistoriqueUtilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    private Utilisateur utilisateur;

    // ── Champ archivé ──
    // POSTE | PROFIL | UNIVERSITE | SPECIALITE | NIVEAU_ETUDE | DATE_FIN_CONTRAT
    @Column(name = "champ", nullable = false, length = 50)
    private String champ;

    @Column(name = "ancienne_valeur", length = 500)
    private String ancienneValeur;

    @Column(name = "nouvelle_valeur", length = 500)
    private String nouvelleValeur;

    // ── Période de validité ──
    @Column(name = "date_debut", nullable = false)
    private LocalDate dateDebut;

    @Column(name = "date_fin")      // null = valeur encore active
    private LocalDate dateFin;

    // ── Traçabilité ──
    @Column(name = "modifie_par", length = 100)
    private String modifiePar;

    @Column(name = "motif", length = 255)
    private String motif;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }
}