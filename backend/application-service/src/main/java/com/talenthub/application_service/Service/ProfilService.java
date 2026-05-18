// Service/ProfilService.java — COMPLET (les guards sont dans les controllers)
package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Profil;
import com.talenthub.application_service.Repository.ProfilRepository;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ProfilService {

    private final ProfilRepository repository;

    public ProfilService(ProfilRepository repository) {
        this.repository = repository;
    }

    public List<Profil> getAllProfils() {
        return repository.findAll();
    }

    public Optional<Profil> getProfilById(Long id) {
        return repository.findById(id);
    }

    public Profil createProfil(Profil profil) {
        return repository.save(profil);
    }

    public Profil updateProfil(Long id, Profil profilDetails) {
        Profil profil = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Profil non trouvé avec id: " + id));
        profil.setNom(profilDetails.getNom());
        profil.setDescription(profilDetails.getDescription());
        profil.setActif(profilDetails.isActif());
        return repository.save(profil);
    }

    public void deleteProfil(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Profil non trouvé avec id: " + id);
        }
        repository.deleteById(id);
    }
}