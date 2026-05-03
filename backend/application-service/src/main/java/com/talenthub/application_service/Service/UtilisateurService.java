package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Permission;
import com.talenthub.application_service.Entity.Profil;
import com.talenthub.application_service.Entity.ProfilPermission;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Exception.DuplicateResourceException;
import com.talenthub.application_service.Repository.PermissionRepository;
import com.talenthub.application_service.Repository.ProfilPermissionRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import com.talenthub.application_service.DTO.UserCreationRequest;
import com.talenthub.application_service.Service.CloudinaryService;

import com.talenthub.application_service.Exception.ResourceNotFoundException;
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
    private final ProfilService profilService;
    private final EmailService emailService;
    private final Keycloak keycloakAdmin;

    private final PermissionRepository permissionRepository;           // ✅ Ajouter
    private final ProfilPermissionRepository profilPermissionRepository; // ✅ Ajouter

    private final CloudinaryService cloudinaryService;
    @Value("${keycloak.realm:talenthub}")
    private String realm;

    public UtilisateurService(UtilisateurRepository repository,
                              ProfilService profilService,
                              EmailService emailService,
                              Keycloak keycloakAdmin,
                              PermissionRepository permissionRepository,
                              ProfilPermissionRepository profilPermissionRepository,
                              CloudinaryService cloudinaryService) {
        this.repository = repository;
        this.profilService = profilService;
        this.emailService = emailService;
        this.keycloakAdmin = keycloakAdmin;
        this.permissionRepository = permissionRepository;
        this.profilPermissionRepository = profilPermissionRepository;
        this.cloudinaryService = cloudinaryService;
    }

    public Utilisateur createUserByAdmin(UserCreationRequest request) {
        if (repository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException(
                    "Un utilisateur avec l'email \"" + request.getEmail() + "\" existe déjà."
            );
        }

        Profil profil = profilService.getProfilById(request.getProfilId())
                .orElseThrow(() -> new ResourceNotFoundException("Profil non trouvé: " + request.getProfilId()));



        String keycloakId = createInKeycloak(request);

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
                .build();

        Utilisateur saved = repository.save(utilisateur);

        // ✅ Sauvegarder les permissions sélectionnées
        if (request.getPermissions() != null && !request.getPermissions().isEmpty()) {
            savePermissions(profil, request.getPermissions());
        }

      /*  try {
            emailService.sendWelcomeEmail(saved);
        } catch (Exception e) {
            System.err.println("Email non envoyé: " + e.getMessage());
        }*/

        return saved;
    }

    // ✅ Nouvelle méthode
    private void savePermissions(Profil profil,
                                 List<UserCreationRequest.PermissionSelectionDTO> selections) {
        for (UserCreationRequest.PermissionSelectionDTO sel : selections) {
            // Vérifier si une entrée existe déjà
            profilPermissionRepository
                    .findByProfilIdAndPermissionId(profil.getId(), sel.getPermissionId())
                    .ifPresentOrElse(
                            existing -> {
                                // Mettre à jour
                                existing.setCanRead(sel.isCanRead());
                                existing.setCanWrite(sel.isCanWrite());
                                existing.setCanDelete(sel.isCanDelete());
                                existing.setCanExport(sel.isCanExport());
                                profilPermissionRepository.save(existing);
                            },
                            () -> {
                                // Créer
                                Permission permission = permissionRepository.findById(sel.getPermissionId())
                                        .orElseThrow(() -> new ResourceNotFoundException(
                                                "Permission non trouvée: " + sel.getPermissionId()));
                                ProfilPermission pp = ProfilPermission.builder()
                                        .profil(profil)
                                        .permission(permission)
                                        .canRead(sel.isCanRead())
                                        .canWrite(sel.isCanWrite())
                                        .canDelete(sel.isCanDelete())
                                        .canExport(sel.isCanExport())
                                        .build();
                                profilPermissionRepository.save(pp);
                            }
                    );
        }
    }





    private String createInKeycloak(UserCreationRequest request) {
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
            if (existing == null || existing.isEmpty()) {
                throw new RuntimeException("Utilisateur Keycloak introuvable après conflit");
            }
            keycloakId = existing.get(0).getId();
        } else {
            throw new RuntimeException("Erreur Keycloak création - status: " + status);
        }

        // === ESSAI SIMPLIFIÉ DE L'EMAIL KEYCLOAK ===
        try {
            List<String> actions = Collections.singletonList("UPDATE_PASSWORD");
            String clientId = "talenthub-frontend";
            String redirectUri = "http://localhost:4200/complete-profile";   // Doit être exactement comme dans Valid Redirect URIs
            Integer lifespan = 86400;

            usersResource.get(keycloakId).executeActionsEmail(
                    clientId,
                    redirectUri,
                    lifespan,
                    actions
            );

            System.out.println("✅ Email envoyé avec redirectUri = " + redirectUri);

        } catch (Exception e) {
            System.err.println("Échec executeActionsEmail : " + e.getMessage());
            e.printStackTrace();
        }

        return keycloakId;
    }


    public List<Utilisateur> getAllUtilisateurs() {
        return repository.findAll();
    }

    public Utilisateur getUtilisateurById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec id: " + id));
    }

    public Utilisateur getUtilisateurByKeycloakId(String keycloakId) {
        return repository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé avec keycloakId: " + keycloakId));
    }

    public void deleteUtilisateur(Long id) {
        repository.deleteById(id);
    }



    public Utilisateur updateUserProfile(String keycloakId, Map<String, Object> updates, MultipartFile photo) throws IOException {
        Utilisateur utilisateur = getUtilisateurByKeycloakId(keycloakId);

        try {
            // 1. Mise à jour des champs texte depuis la Map 'updates'
            if (updates != null) {
                if (updates.containsKey("dateNaissance") && updates.get("dateNaissance") != null) {
                    String dateStr = updates.get("dateNaissance").toString().trim();
                    if (!dateStr.isEmpty()) utilisateur.setDateNaissance(LocalDate.parse(dateStr));
                }

                if (updates.containsKey("dateFinContrat") && updates.get("dateFinContrat") != null) {
                    String dateStr = updates.get("dateFinContrat").toString().trim();
                    if (!dateStr.isEmpty()) utilisateur.setDateFinContrat(LocalDate.parse(dateStr));
                }

                if (updates.containsKey("photoUrl")) {
                    utilisateur.setPhotoUrl((String) updates.get("photoUrl"));
                }
                if (updates.containsKey("telephone")) {
                    utilisateur.setTelephone((String) updates.get("telephone"));
                }
                if (updates.containsKey("adresse")) {
                    utilisateur.setAdresse((String) updates.get("adresse"));
                }
                if (updates.containsKey("poste")) {
                    utilisateur.setPoste((String) updates.get("poste"));
                }
                if (updates.containsKey("departement")) {
                    utilisateur.setDepartement((String) updates.get("departement"));
                }
            }

            // 2. LOGIQUE CLOUDINARY : Si un fichier réel est présent, il est prioritaire
            if (photo != null && !photo.isEmpty()) {
                // On utilise ton service pour uploader et on récupère l'URL sécurisée
                String photoUrl = cloudinaryService.uploadImage(photo, "talenthub/profiles");
                utilisateur.setPhotoUrl(photoUrl);
            }

            // 3. Sauvegarde finale
            return repository.save(utilisateur);

        } catch (Exception e) {
            System.err.println("Erreur lors de la mise à jour du profil pour keycloakId=" + keycloakId);
            e.printStackTrace();
            throw new RuntimeException("Erreur lors de la mise à jour du profil : " + e.getMessage(), e);
        }
    }









    public Utilisateur toggleActif(Long id) {
        Utilisateur u = getUtilisateurById(id);
        u.setActif(!u.isActif());
        // Désactiver aussi dans Keycloak
        try {
            keycloakAdmin.realm(realm).users().get(u.getKeycloakId())
                    .update(buildKcRepresentation(u));
        } catch (Exception e) {
            System.err.println("Keycloak toggle-actif failed: " + e.getMessage());
        }
        return repository.save(u);
    }

    public void resetPassword(Long id) {
        Utilisateur u = getUtilisateurById(id);
        try {
            keycloakAdmin.realm(realm).users().get(u.getKeycloakId())
                    .executeActionsEmail(
                            "talenthub-frontend",
                            "http://localhost:4200",
                            86400,
                            java.util.Collections.singletonList("UPDATE_PASSWORD")
                    );
        } catch (Exception e) {
            throw new RuntimeException("Impossible d'envoyer l'email de réinitialisation: " + e.getMessage());
        }
    }

    public Utilisateur updateByAdmin(Long id, java.util.Map<String, Object> body) {
        Utilisateur u = getUtilisateurById(id);
        if (body.containsKey("nom"))         u.setNom(body.get("nom").toString());
        if (body.containsKey("prenom"))      u.setPrenom(body.get("prenom").toString());
        if (body.containsKey("telephone"))   u.setTelephone(body.get("telephone").toString());
        if (body.containsKey("poste"))       u.setPoste(body.get("poste").toString());
        if (body.containsKey("departement")) u.setDepartement(body.get("departement").toString());
        if (body.containsKey("adresse"))     u.setAdresse(body.get("adresse").toString());
        if (body.containsKey("profilId")) {
            Long profilId = Long.valueOf(body.get("profilId").toString());
            profilService.getProfilById(profilId).ifPresent(u::setProfil);
        }
        if (body.containsKey("dateFinContrat") && body.get("dateFinContrat") != null) {
            u.setDateFinContrat(java.time.LocalDate.parse(body.get("dateFinContrat").toString()));
        }

        if (body.containsKey("dateNaissance") && body.get("dateNaissance") != null) {
        u.setDateNaissance(java.time.LocalDate.parse(body.get("dateNaissance").toString()));}

        return repository.save(u);
    }

    private org.keycloak.representations.idm.UserRepresentation buildKcRepresentation(Utilisateur u) {
        var rep = new org.keycloak.representations.idm.UserRepresentation();
        rep.setEnabled(u.isActif());
        return rep;
    }
}