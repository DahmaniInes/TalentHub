package com.talenthub.application_service.Entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "profils")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Profil {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true, length = 50)
    private String nom; // ex: "ADMIN", "RH", "EMPLOYE", "STAGIAIRE", "MANAGER"

    @Column(length = 255)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    // ── Relations ──

    @OneToMany(mappedBy = "profil", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ProfilPermission> profilPermissions = new ArrayList<>();

    @OneToMany(mappedBy = "profil", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Utilisateur> utilisateurs = new ArrayList<>();


    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }
}
