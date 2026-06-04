// Service/UtilisateurService.java — COMPLET (les guards sont dans le controller)
package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Groupe;
import com.talenthub.application_service.Entity.Profil;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Exception.DuplicateResourceException;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.GroupeRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import com.talenthub.application_service.DTO.UserCreationRequest;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class UtilisateurService {

    private final UtilisateurRepository repository;
    private final ProfilService         profilService;
    private final EmailService          emailService;
    private final Keycloak              keycloakAdmin;
    private final CloudinaryService     cloudinaryService;
    private final GroupeRepository      groupeRepository;

    @Value("${keycloak.realm:talenthub}")
    private String realm;

    public UtilisateurService(
            UtilisateurRepository repository,
            ProfilService profilService,
            EmailService emailService,
            Keycloak keycloakAdmin,
            CloudinaryService cloudinaryService,
            GroupeRepository groupeRepository) {
        this.repository        = repository;
        this.profilService     = profilService;
        this.emailService      = emailService;
        this.keycloakAdmin     = keycloakAdmin;
        this.cloudinaryService = cloudinaryService;
        this.groupeRepository  = groupeRepository;
    }

    // ── Créer un utilisateur ──────────────────────────────────────────────
    public Utilisateur createUserByAdmin(UserCreationRequest request) {
        if (repository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException(
                    "Un utilisateur avec l'email \"" + request.getEmail() + "\" existe déjà.");
        }

        Profil profil = profilService.getProfilById(request.getProfilId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Profil non trouvé: " + request.getProfilId()));

        String keycloakId = createInKeycloak(request, request.getProfilId());

        Utilisateur utilisateur = Utilisateur.builder()
                .keycloakId(keycloakId)
                .nom(request.getNom())
                .prenom(request.getPrenom())
                .email(request.getEmail())
                .telephone(request.getTelephone())
                .dateNaissance(request.getDateNaissance())
                .dateEmbauche(request.getDateEmbauche())
                .dateFinContrat(request.getDateFinContrat())
                .poste(request.getPoste())
                .departement(request.getDepartement())
                .adresse(request.getAdresse())
                .actif(true)
                .profil(profil)
                .universite(request.getUniversite())
                .specialite(request.getSpecialite())
                .niveauEtude(request.getNiveauEtude())
                .dateDebutStage(request.getDateDebutStage())
                .dateFinStage(request.getDateFinStage())
                .dateSoutenance(request.getDateSoutenance())
                .typeStageId(request.getTypeStageId())
                .build();

        return repository.save(utilisateur);
    }

    private String createInKeycloak(UserCreationRequest request, Long profilId) {
        RealmResource realmResource = keycloakAdmin.realm(realm);
        UsersResource usersResource = realmResource.users();

        UserRepresentation user = new UserRepresentation();
        user.setUsername(request.getEmail());
        user.setEmail(request.getEmail());
        user.setFirstName(request.getPrenom());
        user.setLastName(request.getNom());
        user.setEnabled(true);
        user.setEmailVerified(true);
        user.setRequiredActions(Collections.singletonList("UPDATE_PASSWORD"));

        jakarta.ws.rs.core.Response response = usersResource.create(user);
        int status = response.getStatus();

        String keycloakId;
        if (status == 201) {
            keycloakId = response.getLocation().getPath().replaceAll(".*/([^/]+)$", "$1");
        } else if (status == 409) {
            List<UserRepresentation> existing = usersResource.search(request.getEmail(), true);
            if (existing == null || existing.isEmpty())
                throw new RuntimeException("Utilisateur Keycloak introuvable après conflit");
            keycloakId = existing.get(0).getId();
        } else {
            throw new RuntimeException("Erreur Keycloak création - status: " + status);
        }

        // ✅ Sauvegarder profilId dans les attributs Keycloak
        try {
            UserRepresentation userToUpdate = usersResource.get(keycloakId).toRepresentation();
            userToUpdate.setAttributes(Map.of("profilId", List.of(String.valueOf(profilId))));
            usersResource.get(keycloakId).update(userToUpdate);
            System.out.println("✅ profilId=" + profilId + " sauvegardé dans Keycloak");
        } catch (Exception e) {
            System.err.println("Impossible de sauvegarder profilId dans Keycloak: " + e.getMessage());
        }

        // Email de bienvenue
        try {
            usersResource.get(keycloakId).executeActionsEmail(
                    "talenthub-frontend",
                    "http://localhost:4200/complete-profile",
                    86400,
                    Collections.singletonList("UPDATE_PASSWORD")
            );
        } catch (Exception e) {
            System.err.println("Échec executeActionsEmail: " + e.getMessage());
        }

        return keycloakId;
    }

    // ── Mise à jour admin ─────────────────────────────────────────────────
    public Utilisateur updateByAdmin(Long id, Map<String, Object> body) {
        Utilisateur u = getUtilisateurById(id);
        if (body.containsKey("nom"))         u.setNom(body.get("nom").toString());
        if (body.containsKey("prenom"))      u.setPrenom(body.get("prenom").toString());
        if (body.containsKey("telephone"))   u.setTelephone(body.get("telephone").toString());
        if (body.containsKey("poste"))       u.setPoste(body.get("poste").toString());
        if (body.containsKey("departement")) u.setDepartement(body.get("departement").toString());
        if (body.containsKey("adresse"))     u.setAdresse(body.get("adresse").toString());
        if (body.containsKey("dateFinContrat") && body.get("dateFinContrat") != null)
            u.setDateFinContrat(LocalDate.parse(body.get("dateFinContrat").toString()));
        if (body.containsKey("dateNaissance") && body.get("dateNaissance") != null)
            u.setDateNaissance(LocalDate.parse(body.get("dateNaissance").toString()));

        if (body.containsKey("profilId")) {
            Long profilId = Long.valueOf(body.get("profilId").toString());
            profilService.getProfilById(profilId).ifPresent(p -> {
                u.setProfil(p);
                updateProfilIdInKeycloak(u.getKeycloakId(), profilId);
            });
        }
        return repository.save(u);
    }

    private void updateProfilIdInKeycloak(String keycloakId, Long profilId) {
        try {
            UsersResource usersResource = keycloakAdmin.realm(realm).users();
            UserRepresentation user = usersResource.get(keycloakId).toRepresentation();
            user.setAttributes(Map.of("profilId", List.of(String.valueOf(profilId))));
            usersResource.get(keycloakId).update(user);
            System.out.println("✅ profilId mis à jour dans Keycloak pour " + keycloakId);
        } catch (Exception e) {
            System.err.println("Échec mise à jour profilId Keycloak: " + e.getMessage());
        }
    }

    // ── Getters ───────────────────────────────────────────────────────────
    public List<Utilisateur> getAllUtilisateurs() { return repository.findAll(); }

    public Utilisateur getUtilisateurById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé: " + id));
    }

    public Utilisateur getUtilisateurByKeycloakId(String keycloakId) {
        return repository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur non trouvé avec keycloakId: " + keycloakId));
    }

    // ── Supprimer ─────────────────────────────────────────────────────────
    public void deleteUtilisateur(Long id) {
        Utilisateur u = getUtilisateurById(id);
        System.out.println("🗑️ Suppression user id=" + id + " keycloakId=" + u.getKeycloakId());
        String keycloakId = u.getKeycloakId();

        // 1. Retirer des groupes
        try {
            List<Groupe> groupes = groupeRepository.findGroupesByMembreId(id);
            for (Groupe g : groupes) {
                g.getMembres().removeIf(membre -> membre.getId().equals(id));
            }
            if (!groupes.isEmpty()) groupeRepository.saveAll(groupes);
        } catch (Exception e) {
            System.err.println("⚠️ Erreur retrait groupes: " + e.getMessage());
        }

        // 2. Supprimer dans Keycloak
        if (keycloakId != null && !keycloakId.isBlank()) {
            try {
                UsersResource usersResource = keycloakAdmin.realm(realm).users();
                UserRepresentation kcUser = usersResource.get(keycloakId).toRepresentation();
                if (kcUser != null) {
                    usersResource.get(keycloakId).remove();
                    System.out.println("✅ User supprimé de Keycloak: " + keycloakId);
                }
            } catch (Exception e) {
                System.err.println("❌ Keycloak delete failed pour " + keycloakId + " : " + e.getMessage());
            }
        }

        // 3. Supprimer en BD
        repository.delete(u);
        System.out.println("✅ User supprimé en BD: id=" + id);
    }

    // ── Mise à jour profil personnel ──────────────────────────────────────
    public Utilisateur updateUserProfile(String keycloakId,
                                         Map<String, Object> updates,
                                         MultipartFile photo) throws IOException {
        Utilisateur u = getUtilisateurByKeycloakId(keycloakId);
        try {
            if (updates != null) {
                if (updates.containsKey("dateNaissance") && updates.get("dateNaissance") != null) {
                    String s = updates.get("dateNaissance").toString().trim();
                    if (!s.isEmpty()) u.setDateNaissance(LocalDate.parse(s));
                }
                if (updates.containsKey("dateFinContrat") && updates.get("dateFinContrat") != null) {
                    String s = updates.get("dateFinContrat").toString().trim();
                    if (!s.isEmpty()) u.setDateFinContrat(LocalDate.parse(s));
                }
                if (updates.containsKey("photoUrl"))    u.setPhotoUrl((String) updates.get("photoUrl"));
                if (updates.containsKey("telephone"))   u.setTelephone((String) updates.get("telephone"));
                if (updates.containsKey("adresse"))     u.setAdresse((String) updates.get("adresse"));
                if (updates.containsKey("poste"))       u.setPoste((String) updates.get("poste"));
                if (updates.containsKey("departement")) u.setDepartement((String) updates.get("departement"));
            }
            if (photo != null && !photo.isEmpty()) {
                u.setPhotoUrl(cloudinaryService.uploadImage(photo, "talenthub/profiles"));
            }
            return repository.save(u);
        } catch (Exception e) {
            throw new RuntimeException("Erreur mise à jour profil: " + e.getMessage(), e);
        }
    }

    // ── Toggle actif ──────────────────────────────────────────────────────
    public Utilisateur toggleActif(Long id) {
        Utilisateur u = getUtilisateurById(id);
        u.setActif(!u.isActif());
        try {
            var rep = new UserRepresentation();
            rep.setEnabled(u.isActif());
            keycloakAdmin.realm(realm).users().get(u.getKeycloakId()).update(rep);
        } catch (Exception e) {
            System.err.println("Keycloak toggle-actif failed: " + e.getMessage());
        }
        return repository.save(u);
    }

    // ── Reset password ────────────────────────────────────────────────────
    public void resetPassword(Long id) {
        Utilisateur u = getUtilisateurById(id);
        try {
            keycloakAdmin.realm(realm).users().get(u.getKeycloakId())
                    .executeActionsEmail("talenthub-frontend", "http://localhost:4200",
                            86400, Collections.singletonList("UPDATE_PASSWORD"));
        } catch (Exception e) {
            throw new RuntimeException("Impossible d'envoyer l'email: " + e.getMessage());
        }
    }

    // ── Sync profilIds Keycloak ───────────────────────────────────────────
    public Map<String, Object> syncAllProfilIdsToKeycloak() {
        List<Utilisateur> users = repository.findAll();
        int success = 0, failed = 0;
        UsersResource usersResource = keycloakAdmin.realm(realm).users();

        for (Utilisateur u : users) {
            if (u.getKeycloakId() == null || u.getProfil() == null) { failed++; continue; }
            try {
                UserRepresentation kcUser = usersResource.get(u.getKeycloakId()).toRepresentation();
                if (kcUser == null) { failed++; continue; }
                java.util.Map<String, List<String>> attrs = kcUser.getAttributes();
                if (attrs == null) attrs = new java.util.HashMap<>();
                attrs.put("profilId", List.of(String.valueOf(u.getProfil().getId())));
                kcUser.setAttributes(attrs);
                usersResource.get(u.getKeycloakId()).update(kcUser);
                System.out.println("✅ Sync profilId=" + u.getProfil().getId()
                        + " pour user=" + u.getEmail());
                success++;
            } catch (Exception e) {
                System.err.println("❌ Sync échoué pour " + u.getEmail() + " : " + e.getMessage());
                failed++;
            }
        }

        return Map.of(
                "total",   users.size(),
                "success", success,
                "failed",  failed,
                "message", "Sync terminé. Reconnectez-vous pour obtenir un nouveau token."
        );
    }
}