package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ProfilDTO;
import com.talenthub.application_service.Entity.Profil;
import com.talenthub.application_service.Service.ProfilService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/profils")
public class ProfilController {

    private final ProfilService profilService;

    public ProfilController(ProfilService profilService) {
        this.profilService = profilService;
    }

    // ✅ Retourne des DTOs — plus de boucle JSON
    @GetMapping
    public ResponseEntity<List<ProfilDTO>> getAllProfils() {
        List<ProfilDTO> dtos = profilService.getAllProfils()
                .stream()
                .map(p -> new ProfilDTO(p.getId(), p.getNom(), p.getDescription(), p.isActif()))
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProfilDTO> getProfilById(@PathVariable Long id) {
        return profilService.getProfilById(id)
                .map(p -> ResponseEntity.ok(new ProfilDTO(p.getId(), p.getNom(), p.getDescription(), p.isActif())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ProfilDTO> createProfil(@Valid @RequestBody ProfilDTO dto) {
        Profil profil = new Profil();
        profil.setNom(dto.getNom());
        profil.setDescription(dto.getDescription());
        profil.setActif(dto.isActif());

        Profil created = profilService.createProfil(profil);
        return new ResponseEntity<>(
                new ProfilDTO(created.getId(), created.getNom(), created.getDescription(), created.isActif()),
                HttpStatus.CREATED
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProfilDTO> updateProfil(
            @PathVariable Long id,
            @Valid @RequestBody ProfilDTO dto) {
        Profil details = new Profil();
        details.setNom(dto.getNom());
        details.setDescription(dto.getDescription());
        details.setActif(dto.isActif());

        Profil updated = profilService.updateProfil(id, details);
        return ResponseEntity.ok(
                new ProfilDTO(updated.getId(), updated.getNom(), updated.getDescription(), updated.isActif())
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProfil(@PathVariable Long id) {
        profilService.deleteProfil(id);
        return ResponseEntity.noContent().build();
    }
}