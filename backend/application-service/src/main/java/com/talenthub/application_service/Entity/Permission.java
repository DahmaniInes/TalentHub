package com.talenthub.application_service.Entity;


import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ex: "CONGE_CREATE", "DOCUMENT_READ", "RAPPORT_EXPORT"
    @NotBlank
    @Column(nullable = false, unique = true, length = 100)
    private String code;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String libelle;

    // ex: "CONGES", "DOCUMENTS", "RAPPORTS", "UTILISATEURS"
    @Column(nullable = false, length = 50)
    private String module;

    @Column(length = 255)
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private boolean actif = true;

    // ── Relations ──

    @OneToMany(mappedBy = "permission", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ProfilPermission> profilPermissions = new ArrayList<>();

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
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

    public List<ProfilPermission> getProfilPermissions() {
        return profilPermissions;
    }

    public void setProfilPermissions(List<ProfilPermission> profilPermissions) {
        this.profilPermissions = profilPermissions;
    }
}
