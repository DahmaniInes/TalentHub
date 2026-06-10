package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.UserCreationRequest;
import com.talenthub.application_service.Entity.*;
import com.talenthub.application_service.Exception.*;
import com.talenthub.application_service.Repository.*;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.time.LocalDate;
import java.util.*;

@Service
@Transactional
public class UtilisateurService {

    private final UtilisateurRepository           repository;
    private final ProfilService                   profilService;
    private final EmailService                    emailService;
    private final Keycloak                        keycloakAdmin;
    private final CloudinaryService               cloudinaryService;
    private final GroupeRepository                groupeRepository;
    private final StageRepository                 stageRepository;
    private final HistoriqueUtilisateurService     historiqueService;

    @Value("${keycloak.realm:talenthub}")
    private String realm;

    public UtilisateurService(
            UtilisateurRepository repository,
            ProfilService profilService,
            EmailService emailService,
            Keycloak keycloakAdmin,
            CloudinaryService cloudinaryService,
            GroupeRepository groupeRepository,
            StageRepository stageRepository,
            HistoriqueUtilisateurService historiqueService) {
        this.repository        = repository;
        this.profilService     = profilService;
        this.emailService      = emailService;
        this.keycloakAdmin     = keycloakAdmin;
        this.cloudinaryService = cloudinaryService;
        this.groupeRepository  = groupeRepository;
        this.stageRepository   = stageRepository;
        this.historiqueService = historiqueService;
    }

    // ── Créer ────────────────────────────────────────────────────
    public Utilisateur createUserByAdmin(UserCreationRequest request) {
        if (repository.existsByEmail(request.getEmail()))
            throw new DuplicateResourceException(
                    "Un utilisateur avec l'email \""
                            + request.getEmail() + "\" existe déjà.");

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
                .dateEmbauche(request.getDateEmbauche() != null
                        ? request.getDateEmbauche() : LocalDate.now())
                .dateFinContrat(request.getDateFinContrat())
                .poste(request.getPoste())
                .departement(request.getDepartement())
                .adresse(request.getAdresse())
                .actif(true)
                .profil(profil)
                .universiteId(request.getUniversiteId())
                .specialiteId(request.getSpecialiteId())
                .niveauEtudeId(request.getNiveauEtudeId())
                .build();

        Utilisateur saved = repository.save(utilisateur);

        // ── Archiver l'état initial champ par champ ──
        historiqueService.enregistrerChangement(
                saved, HistoriqueUtilisateurService.POSTE,
                null, saved.getPoste(), "system");

        if (saved.getProfil() != null)
            historiqueService.enregistrerChangement(
                    saved, HistoriqueUtilisateurService.PROFIL,
                    null, saved.getProfil().getNom(), "system");

        if (saved.getUniversiteId() != null)
            historiqueService.enregistrerChangement(
                    saved, HistoriqueUtilisateurService.UNIVERSITE,
                    null, saved.getUniversiteId().toString(), "system");

        if (saved.getSpecialiteId() != null)
            historiqueService.enregistrerChangement(
                    saved, HistoriqueUtilisateurService.SPECIALITE,
                    null, saved.getSpecialiteId().toString(), "system");

        if (saved.getNiveauEtudeId() != null)
            historiqueService.enregistrerChangement(
                    saved, HistoriqueUtilisateurService.NIVEAU_ETUDE,
                    null, saved.getNiveauEtudeId().toString(), "system");

        if (saved.getDateFinContrat() != null)
            historiqueService.enregistrerChangement(
                    saved, HistoriqueUtilisateurService.DATE_FIN_CONTRAT,
                    null, saved.getDateFinContrat().toString(), "system");

        // ── Premier stage si infos fournies ──
        if (request.getTypeStageId() != null
                || request.getDateDebutStage() != null
                || request.getDateFinStage() != null) {
            Stage stage = Stage.builder()
                    .utilisateur(saved)
                    .typeStageId(request.getTypeStageId())
                    .dateDebut(request.getDateDebutStage())
                    .dateFin(request.getDateFinStage())
                    .dateSoutenance(request.getDateSoutenance())
                    .statutStageId(1L)
                    .build();
            stageRepository.save(stage);
        }

        return saved;
    }

    // ── Mise à jour admin ────────────────────────────────────────
    public Utilisateur updateByAdmin(Long id, Map<String, Object> body) {
        Utilisateur u = getUtilisateurById(id);

        // ✅ Tableau à 1 élément pour contourner "effectively final" dans le lambda
        boolean[] changed = {false};

        // ── Capturer les anciennes valeurs AVANT modification ──
        String ancienPoste          = u.getPoste();
        String ancienProfilNom      = u.getProfil() != null ? u.getProfil().getNom() : null;
        String ancienUniversiteId   = u.getUniversiteId()   != null
                ? u.getUniversiteId().toString()   : null;
        String ancienSpecialiteId   = u.getSpecialiteId()   != null
                ? u.getSpecialiteId().toString()   : null;
        String ancienNiveauEtudeId  = u.getNiveauEtudeId()  != null
                ? u.getNiveauEtudeId().toString()  : null;
        String ancienDateFinContrat = u.getDateFinContrat() != null
                ? u.getDateFinContrat().toString() : null;

        // ── Appliquer les modifications ──
        if (body.containsKey("nom") && body.get("nom") != null) {
            u.setNom(body.get("nom").toString());
            changed[0] = true;
        }
        if (body.containsKey("prenom") && body.get("prenom") != null) {
            u.setPrenom(body.get("prenom").toString());
            changed[0] = true;
        }
        if (body.containsKey("telephone") && body.get("telephone") != null)
            u.setTelephone(body.get("telephone").toString());

        if (body.containsKey("poste") && body.get("poste") != null) {
            u.setPoste(body.get("poste").toString());
            changed[0] = true;
        }
        if (body.containsKey("departement") && body.get("departement") != null)
            u.setDepartement(body.get("departement").toString());

        if (body.containsKey("adresse") && body.get("adresse") != null)
            u.setAdresse(body.get("adresse").toString());

        if (body.containsKey("universiteId") && body.get("universiteId") != null) {
            u.setUniversiteId(Long.valueOf(body.get("universiteId").toString()));
            changed[0] = true;
        }
        if (body.containsKey("specialiteId") && body.get("specialiteId") != null) {
            u.setSpecialiteId(Long.valueOf(body.get("specialiteId").toString()));
            changed[0] = true;
        }
        if (body.containsKey("niveauEtudeId") && body.get("niveauEtudeId") != null) {
            u.setNiveauEtudeId(Long.valueOf(body.get("niveauEtudeId").toString()));
            changed[0] = true;
        }
        if (body.containsKey("dateFinContrat") && body.get("dateFinContrat") != null) {
            u.setDateFinContrat(LocalDate.parse(
                    body.get("dateFinContrat").toString()));
            changed[0] = true;
        }
        if (body.containsKey("dateNaissance") && body.get("dateNaissance") != null)
            u.setDateNaissance(LocalDate.parse(
                    body.get("dateNaissance").toString()));

        // ✅ Profil — lambda compatible grâce au tableau
        if (body.containsKey("profilId") && body.get("profilId") != null) {
            Long profilId = Long.valueOf(body.get("profilId").toString());
            profilService.getProfilById(profilId).ifPresent(p -> {
                u.setProfil(p);
                changed[0] = true;
                updateProfilIdInKeycloak(u.getKeycloakId(), profilId);
            });
        }

        Utilisateur saved = repository.save(u);

        // ── Archiver les changements si quelque chose a changé ──
        if (changed[0]) {
            String modifiePar = body.containsKey("modifieParKeycloakId")
                    && body.get("modifieParKeycloakId") != null
                    ? body.get("modifieParKeycloakId").toString()
                    : "admin";

            // POSTE
            if (body.containsKey("poste") && body.get("poste") != null)
                historiqueService.enregistrerChangement(
                        saved, HistoriqueUtilisateurService.POSTE,
                        ancienPoste,
                        saved.getPoste(),
                        modifiePar);

            // PROFIL
            if (body.containsKey("profilId") && body.get("profilId") != null) {
                String nouveauProfilNom = saved.getProfil() != null
                        ? saved.getProfil().getNom() : null;
                historiqueService.enregistrerChangement(
                        saved, HistoriqueUtilisateurService.PROFIL,
                        ancienProfilNom,
                        nouveauProfilNom,
                        modifiePar);
            }

            // UNIVERSITE
            if (body.containsKey("universiteId") && body.get("universiteId") != null)
                historiqueService.enregistrerChangement(
                        saved, HistoriqueUtilisateurService.UNIVERSITE,
                        ancienUniversiteId,
                        saved.getUniversiteId() != null
                                ? saved.getUniversiteId().toString() : null,
                        modifiePar);

            // SPECIALITE
            if (body.containsKey("specialiteId") && body.get("specialiteId") != null)
                historiqueService.enregistrerChangement(
                        saved, HistoriqueUtilisateurService.SPECIALITE,
                        ancienSpecialiteId,
                        saved.getSpecialiteId() != null
                                ? saved.getSpecialiteId().toString() : null,
                        modifiePar);

            // NIVEAU_ETUDE
            if (body.containsKey("niveauEtudeId") && body.get("niveauEtudeId") != null)
                historiqueService.enregistrerChangement(
                        saved, HistoriqueUtilisateurService.NIVEAU_ETUDE,
                        ancienNiveauEtudeId,
                        saved.getNiveauEtudeId() != null
                                ? saved.getNiveauEtudeId().toString() : null,
                        modifiePar);

            // DATE_FIN_CONTRAT
            if (body.containsKey("dateFinContrat") && body.get("dateFinContrat") != null)
                historiqueService.enregistrerChangement(
                        saved, HistoriqueUtilisateurService.DATE_FIN_CONTRAT,
                        ancienDateFinContrat,
                        saved.getDateFinContrat() != null
                                ? saved.getDateFinContrat().toString() : null,
                        modifiePar);
        }

        return saved;
    }

    // ── Keycloak helpers ─────────────────────────────────────────
    private String createInKeycloak(UserCreationRequest request, Long profilId) {
        var usersResource = keycloakAdmin.realm(realm).users();

        UserRepresentation user = new UserRepresentation();
        user.setUsername(request.getEmail());
        user.setEmail(request.getEmail());
        user.setFirstName(request.getPrenom());
        user.setLastName(request.getNom());
        user.setEnabled(true);
        user.setEmailVerified(true);
        user.setRequiredActions(Collections.singletonList("UPDATE_PASSWORD"));

        var response = usersResource.create(user);
        int status = response.getStatus();
        String keycloakId;

        if (status == 201) {
            keycloakId = response.getLocation().getPath()
                    .replaceAll(".*/([^/]+)$", "$1");
        } else if (status == 409) {
            var existing = usersResource.search(request.getEmail(), true);
            if (existing == null || existing.isEmpty())
                throw new RuntimeException(
                        "Utilisateur Keycloak introuvable après conflit");
            keycloakId = existing.get(0).getId();
        } else {
            throw new RuntimeException(
                    "Erreur Keycloak création - status: " + status);
        }

        try {
            var userToUpdate = usersResource.get(keycloakId).toRepresentation();
            userToUpdate.setAttributes(
                    Map.of("profilId", List.of(String.valueOf(profilId))));
            usersResource.get(keycloakId).update(userToUpdate);
        } catch (Exception e) {
            System.err.println("Impossible de sauvegarder profilId: "
                    + e.getMessage());
        }

        try {
            usersResource.get(keycloakId).executeActionsEmail(
                    "talenthub-frontend",
                    "http://localhost:4200/complete-profile",
                    86400,
                    Collections.singletonList("UPDATE_PASSWORD"));
        } catch (Exception e) {
            System.err.println("Échec executeActionsEmail: " + e.getMessage());
        }

        return keycloakId;
    }

    private void updateProfilIdInKeycloak(String keycloakId, Long profilId) {
        try {
            var usersResource = keycloakAdmin.realm(realm).users();
            var user = usersResource.get(keycloakId).toRepresentation();
            user.setAttributes(
                    Map.of("profilId", List.of(String.valueOf(profilId))));
            usersResource.get(keycloakId).update(user);
        } catch (Exception e) {
            System.err.println("Échec mise à jour profilId Keycloak: "
                    + e.getMessage());
        }
    }

    // ── Getters ──────────────────────────────────────────────────
    public List<Utilisateur> getAllUtilisateurs() {
        return repository.findAll();
    }

    public Utilisateur getUtilisateurById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur non trouvé: " + id));
    }

    public Utilisateur getUtilisateurByKeycloakId(String keycloakId) {
        return repository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur non trouvé avec keycloakId: " + keycloakId));
    }

    // ── Supprimer ────────────────────────────────────────────────
    public void deleteUtilisateur(Long id) {
        Utilisateur u = getUtilisateurById(id);
        String keycloakId = u.getKeycloakId();

        try {
            List<Groupe> groupes = groupeRepository.findGroupesByMembreId(id);
            groupes.forEach(g ->
                    g.getMembres().removeIf(m -> m.getId().equals(id)));
            if (!groupes.isEmpty()) groupeRepository.saveAll(groupes);
        } catch (Exception e) {
            System.err.println("⚠️ Erreur retrait groupes: " + e.getMessage());
        }

        if (keycloakId != null && !keycloakId.isBlank()) {
            try {
                keycloakAdmin.realm(realm).users().get(keycloakId).remove();
            } catch (Exception e) {
                System.err.println("❌ Keycloak delete failed: "
                        + e.getMessage());
            }
        }

        repository.delete(u);
    }

    // ── Profil personnel ─────────────────────────────────────────
    public Utilisateur updateUserProfile(String keycloakId,
                                         Map<String, Object> updates,
                                         MultipartFile photo) throws IOException {
        Utilisateur u = getUtilisateurByKeycloakId(keycloakId);

        if (updates != null) {
            if (updates.containsKey("dateNaissance")
                    && updates.get("dateNaissance") != null) {
                String s = updates.get("dateNaissance").toString().trim();
                if (!s.isEmpty()) u.setDateNaissance(LocalDate.parse(s));
            }
            if (updates.containsKey("dateFinContrat")
                    && updates.get("dateFinContrat") != null) {
                String s = updates.get("dateFinContrat").toString().trim();
                if (!s.isEmpty()) u.setDateFinContrat(LocalDate.parse(s));
            }
            if (updates.containsKey("photoUrl"))
                u.setPhotoUrl((String) updates.get("photoUrl"));
            if (updates.containsKey("telephone"))
                u.setTelephone((String) updates.get("telephone"));
            if (updates.containsKey("adresse"))
                u.setAdresse((String) updates.get("adresse"));
            if (updates.containsKey("poste"))
                u.setPoste((String) updates.get("poste"));
            if (updates.containsKey("departement"))
                u.setDepartement((String) updates.get("departement"));
        }

        if (photo != null && !photo.isEmpty())
            u.setPhotoUrl(cloudinaryService.uploadImage(photo,
                    "talenthub/profiles"));

        return repository.save(u);
    }

    // ── Toggle actif ─────────────────────────────────────────────
    public Utilisateur toggleActif(Long id) {
        Utilisateur u = getUtilisateurById(id);
        u.setActif(!u.isActif());
        try {
            var rep = new UserRepresentation();
            rep.setEnabled(u.isActif());
            keycloakAdmin.realm(realm).users()
                    .get(u.getKeycloakId()).update(rep);
        } catch (Exception e) {
            System.err.println("Keycloak toggle-actif failed: "
                    + e.getMessage());
        }
        return repository.save(u);
    }

    // ── Reset password ───────────────────────────────────────────
    public void resetPassword(Long id) {
        Utilisateur u = getUtilisateurById(id);
        try {
            keycloakAdmin.realm(realm).users().get(u.getKeycloakId())
                    .executeActionsEmail(
                            "talenthub-frontend",
                            "http://localhost:4200",
                            86400,
                            Collections.singletonList("UPDATE_PASSWORD"));
        } catch (Exception e) {
            throw new RuntimeException(
                    "Impossible d'envoyer l'email: " + e.getMessage());
        }
    }

    // ── Sync Keycloak ────────────────────────────────────────────
    public Map<String, Object> syncAllProfilIdsToKeycloak() {
        List<Utilisateur> users = repository.findAll();
        int success = 0, failed = 0;
        var usersResource = keycloakAdmin.realm(realm).users();

        for (Utilisateur u : users) {
            if (u.getKeycloakId() == null || u.getProfil() == null) {
                failed++;
                continue;
            }
            try {
                var kcUser = usersResource.get(u.getKeycloakId())
                        .toRepresentation();
                if (kcUser == null) { failed++; continue; }
                var attrs = kcUser.getAttributes();
                if (attrs == null) attrs = new HashMap<>();
                attrs.put("profilId",
                        List.of(String.valueOf(u.getProfil().getId())));
                kcUser.setAttributes(attrs);
                usersResource.get(u.getKeycloakId()).update(kcUser);
                success++;
            } catch (Exception e) {
                failed++;
            }
        }

        return Map.of(
                "total",   users.size(),
                "success", success,
                "failed",  failed,
                "message", "Sync terminé.");
    }
}