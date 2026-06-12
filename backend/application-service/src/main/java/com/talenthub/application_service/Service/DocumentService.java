package com.talenthub.application_service.Service;

import com.talenthub.application_service.DTO.DocumentDTO;
import com.talenthub.application_service.Entity.*;
import com.talenthub.application_service.Exception.ResourceNotFoundException;
import com.talenthub.application_service.Repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository    documentRepo;
    private final ProjetRepository      projetRepo;
    private final ActiviteRepository    activiteRepo;
    private final UtilisateurRepository utilisateurRepo;
    private final StageRepository       stageRepo;
    private final CloudinaryService     cloudinaryService;
    private final RestTemplate          restTemplate;

    @Value("${nomenclature.service.url:http://localhost:8083/api}")
    private String nomenclatureUrl;

    // Cache des types et statuts documents
    private final Map<Long, Map<String, Object>> typeDocCache   = new ConcurrentHashMap<>();
    private final Map<Long, Map<String, Object>> statutDocCache = new ConcurrentHashMap<>();

    // ── Lecture ──

    @Transactional(readOnly = true)
    public List<DocumentDTO> getByProjet(Long projetId) {
        return documentRepo.findByProjetId(projetId).stream()
                .map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentDTO> getByActivite(Long activiteId) {
        return documentRepo.findByActiviteId(activiteId).stream()
                .map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentDTO> getByUtilisateur(Long userId) {
        return documentRepo.findByUtilisateurId(userId).stream()
                .map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public DocumentDTO getById(Long id) {
        return toDTO(documentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document non trouvé: " + id)));
    }

    // ── Upload + création ──

    /**
     * Upload un fichier sur Cloudinary et crée l'entrée Document en BDD.
     * Fonctionne pour projets ET activités.
     */
    @Transactional
    public DocumentDTO upload(MultipartFile file, Long utilisateurId,
                              Long projetId, Long activiteId, Long stageId,
                              Long typeDocumentId, String description,
                              boolean confidentiel) throws IOException {

        // 1. Upload sur Cloudinary
        String folder = "talenthub/documents";
        String cloudinaryUrl = cloudinaryService.uploadDocument(file, folder);

        // 2. Construire l'entité
        Document doc = Document.builder()
                .nom(file.getOriginalFilename())
                .nomFichier(file.getOriginalFilename())
                .cheminFichier(cloudinaryUrl)      // URL Cloudinary
                .typeMime(file.getContentType())
                .tailleFichier(file.getSize())
                .typeDocumentId(typeDocumentId != null ? typeDocumentId : 5L) // 5 = AUTRE
                .statutDocumentId(1L)               // 1 = ACTIF
                .description(description)
                .estConfidentiel(confidentiel)
                .build();

        // 3. Lier au propriétaire
        utilisateurRepo.findById(utilisateurId).ifPresent(doc::setUtilisateur);

        if (projetId != null)
            projetRepo.findById(projetId).ifPresent(doc::setProjet);

        if (activiteId != null)
            activiteRepo.findById(activiteId).ifPresent(doc::setActivite);

        if (stageId != null)
            stageRepo.findById(stageId).ifPresent(doc::setStage);

        return toDTO(documentRepo.save(doc));
    }

    // ── Suppression (soft delete = statut SUPPRIME) ──

    @Transactional
    public void delete(Long id) {
        Document doc = documentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document non trouvé: " + id));
        // Soft delete : statut = SUPPRIME (id=3)
        doc.setStatutDocumentId(3L);
        documentRepo.save(doc);
    }

    // ── Hard delete (admin) ──
    @Transactional
    public void hardDelete(Long id) {
        if (!documentRepo.existsById(id))
            throw new ResourceNotFoundException("Document non trouvé: " + id);
        documentRepo.deleteById(id);
    }

    // ── Enrichissement DTO ──

    public DocumentDTO toDTO(Document d) {
        DocumentDTO dto = new DocumentDTO(d);
        // Enrichir depuis cache nomenclature
        if (d.getTypeDocumentId() != null) {
            Map<String, Object> type = getTypeDoc(d.getTypeDocumentId());
            if (type != null) dto.setTypeDocumentLibelle(
                    String.valueOf(type.getOrDefault("libelle", "—")));
        }
        if (d.getStatutDocumentId() != null) {
            Map<String, Object> statut = getStatutDoc(d.getStatutDocumentId());
            if (statut != null) {
                dto.setStatutDocumentCode(String.valueOf(statut.getOrDefault("code", "")));
                dto.setStatutDocumentLibelle(String.valueOf(statut.getOrDefault("libelle", "—")));
            }
        }
        return dto;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getTypeDoc(Long id) {
        if (typeDocCache.containsKey(id)) return typeDocCache.get(id);
        try {
            Map<String, Object> r = restTemplate.getForObject(
                    nomenclatureUrl + "/type-document/" + id, Map.class);
            if (r != null) typeDocCache.put(id, r);
            return r;
        } catch (Exception e) { return null; }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getStatutDoc(Long id) {
        if (statutDocCache.containsKey(id)) return statutDocCache.get(id);
        try {
            Map<String, Object> r = restTemplate.getForObject(
                    nomenclatureUrl + "/statut-document/" + id, Map.class);
            if (r != null) statutDocCache.put(id, r);
            return r;
        } catch (Exception e) { return null; }
    }
}