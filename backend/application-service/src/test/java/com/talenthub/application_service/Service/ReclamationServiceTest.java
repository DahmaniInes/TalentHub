package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.ReclamationRequest;
import com.talenthub.application_service.Entity.Reclamation;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Service.NotificationService;
import com.talenthub.application_service.Repository.ProfilPermissionRepository;
import com.talenthub.application_service.Repository.ReclamationRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReclamationServiceTest {

    @Mock
    private ReclamationRepository repository;

    @Mock
    private UtilisateurRepository utilisateurRepo;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ProfilPermissionRepository profilPermRepo;

    @InjectMocks
    private ReclamationService reclamationService;

    private Utilisateur utilisateur;
    private Reclamation reclamation;

    @BeforeEach
    void setUp() {
        utilisateur = Utilisateur.builder()
                .id(1L)
                .keycloakId("kc-user-1")
                .nom("Dahmani")
                .prenom("Ines")
                .build();

        reclamation = Reclamation.builder()
                .id(10L)
                .utilisateur(utilisateur)
                .serviceReclamationId(2L)
                .statutReclamationId(1L)
                .sujet("Problème de matériel")
                .description("Mon écran ne fonctionne plus")
                .build();
    }

    // ── Tests sur create() ──────────────────────────────────────────────

    @Test
    void create_devraitCreerLaReclamationAvecStatutParDefaut() {
        // Arrange
        ReclamationRequest req = new ReclamationRequest();
        req.setUtilisateurId(1L);
        req.setServiceReclamationId(2L);
        req.setSujet("Problème de matériel");
        req.setDescription("Mon écran ne fonctionne plus");
        // statutReclamationId volontairement non renseigné → doit valoir 1L par défaut

        when(utilisateurRepo.findById(1L)).thenReturn(Optional.of(utilisateur));
        when(repository.save(any(Reclamation.class))).thenAnswer(inv -> inv.getArgument(0));
        when(utilisateurRepo.findAll()).thenReturn(List.of()); // aucun agent à notifier

        // Act
        Reclamation result = reclamationService.create(req);

        // Assert
        assertThat(result.getStatutReclamationId()).isEqualTo(1L);
        assertThat(result.getSujet()).isEqualTo("Problème de matériel");
        assertThat(result.getUtilisateur()).isEqualTo(utilisateur);
        verify(repository, times(1)).save(any(Reclamation.class));
    }

    @Test
    void create_devraitLeverExceptionSiUtilisateurIntrouvable() {
        // Arrange
        ReclamationRequest req = new ReclamationRequest();
        req.setUtilisateurId(999L);

        when(utilisateurRepo.findById(999L)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> reclamationService.create(req))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");

        verify(repository, never()).save(any());
    }

    // ── Tests sur traiter() ─────────────────────────────────────────────

    @Test
    void traiter_devraitMettreAJourStatutEtCommentaire() {
        // Arrange
        when(repository.findById(10L)).thenReturn(Optional.of(reclamation));
        when(repository.save(any(Reclamation.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        Reclamation result = reclamationService.traiter(
                10L, 3L, "kc-agent-1", "Problème résolu après remplacement", "RESOLUE"
        );

        // Assert
        assertThat(result.getStatutReclamationId()).isEqualTo(3L);
        assertThat(result.getTraitePar()).isEqualTo("kc-agent-1");
        assertThat(result.getCommentaireTraitement()).isEqualTo("Problème résolu après remplacement");
        assertThat(result.getDateTraitement()).isNotNull();

        // Vérifie que la notification "résolue" a bien été envoyée à l'utilisateur
        verify(notificationService, times(1)).creer(
                eq("kc-user-1"), any(), any(), any(), any(), any()
        );
    }

    @Test
    void traiter_devraitLeverExceptionSiReclamationIntrouvable() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                reclamationService.traiter(999L, 3L, "kc-agent-1", "commentaire", "RESOLUE")
        ).isInstanceOf(ResourceNotFoundException.class);
    }

    // ── Tests sur delete() ──────────────────────────────────────────────

    @Test
    void delete_devraitSupprimerSiExiste() {
        when(repository.existsById(10L)).thenReturn(true);

        reclamationService.delete(10L);

        verify(repository, times(1)).deleteById(10L);
    }

    @Test
    void delete_devraitLeverExceptionSiInexistante() {
        when(repository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> reclamationService.delete(999L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(repository, never()).deleteById(any());
    }

    // ── Tests sur isOwner() ─────────────────────────────────────────────

    @Test
    void isOwner_devraitRetournerTrueSiMemeKeycloakId() {
        when(repository.findById(10L)).thenReturn(Optional.of(reclamation));

        boolean result = reclamationService.isOwner(10L, "kc-user-1");

        assertThat(result).isTrue();
    }

    @Test
    void isOwner_devraitRetournerFalseSiKeycloakIdDifferent() {
        when(repository.findById(10L)).thenReturn(Optional.of(reclamation));

        boolean result = reclamationService.isOwner(10L, "kc-autre-user");

        assertThat(result).isFalse();
    }

    @Test
    void isOwner_devraitRetournerFalseSiReclamationIntrouvable() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        boolean result = reclamationService.isOwner(999L, "kc-user-1");

        assertThat(result).isFalse();
    }
}