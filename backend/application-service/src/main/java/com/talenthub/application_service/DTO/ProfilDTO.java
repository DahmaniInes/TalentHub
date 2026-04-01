package com.talenthub.application_service.DTO;


import com.talenthub.application_service.Entity.Profil;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfilDTO {
    private Long id;
    private String nom;
    private String description;
    private boolean actif;

    // ✅ Constructeur depuis l'entité — évite la répétition dans le controller
    public static ProfilDTO from(Profil profil) {
        return new ProfilDTO(
                profil.getId(),
                profil.getNom(),
                profil.getDescription(),
                profil.isActif()
        );
    }
}