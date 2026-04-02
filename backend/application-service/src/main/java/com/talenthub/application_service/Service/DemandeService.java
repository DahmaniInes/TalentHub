package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.DemandeRequest;
import com.talenthub.application_service.Entity.Demande;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.DemandeRepository;
import com.talenthub.application_service.Repository.UtilisateurRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class DemandeService {

    private final DemandeRepository repository;
    private final UtilisateurRepository utilisateurRepository;

    public DemandeService(DemandeRepository repository,
                          UtilisateurRepository utilisateurRepository) {
        this.repository = repository;
        this.utilisateurRepository = utilisateurRepository;
    }

    public List<Demande> getAll() { return repository.findAll(); }

    public Optional<Demande> getById(Long id) { return repository.findById(id); }

    public List<Demande> getByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurIdOrderByDateCreationDesc(utilisateurId);
    }

    public List<Demande> getByStatut(Long statutId) {
        return repository.findByStatutDemandeId(statutId);
    }

    public Demande create(DemandeRequest req) {
        Utilisateur utilisateur = utilisateurRepository.findById(req.getUtilisateurId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Utilisateur non trouvé: " + req.getUtilisateurId()));

        // Calcul automatique nbJours si dates présentes
        Integer nbJours = req.getNbJours();
        if (nbJours == null && req.getDateDebut() != null && req.getDateFin() != null) {
            nbJours = (int) (req.getDateDebut().until(req.getDateFin()).getDays() + 1);
        }

        Demande d = Demande.builder()
                .utilisateur(utilisateur)
                .typeDemandeId(req.getTypeDemandeId())
                .statutDemandeId(req.getStatutDemandeId() != null ? req.getStatutDemandeId() : 1L)
                .sujet(req.getSujet())
                .description(req.getDescription())
                .dateDebut(req.getDateDebut())
                .dateFin(req.getDateFin())
                .nbJours(nbJours)
                .pieceJointeUrl(req.getPieceJointeUrl())
                .build();

        return repository.save(d);
    }

    public Demande update(Long id, DemandeRequest req) {
        Demande d = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande non trouvée: " + id));

        d.setSujet(req.getSujet());
        d.setDescription(req.getDescription());
        d.setDateDebut(req.getDateDebut());
        d.setDateFin(req.getDateFin());
        d.setNbJours(req.getNbJours());
        d.setTypeDemandeId(req.getTypeDemandeId());
        if (req.getStatutDemandeId() != null) d.setStatutDemandeId(req.getStatutDemandeId());
        return repository.save(d);
    }

    public Demande traiter(Long id, Long statutId, String traitePar, String commentaireRH) {
        Demande d = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Demande non trouvée: " + id));
        d.setStatutDemandeId(statutId);
        d.setTraitePar(traitePar);
        d.setCommentaireRH(commentaireRH);
        d.setDateTraitement(LocalDateTime.now());
        return repository.save(d);
    }

    public void delete(Long id) {
        if (!repository.existsById(id))
            throw new ResourceNotFoundException("Demande non trouvée: " + id);
        repository.deleteById(id);
    }
}