package com.talenthub.application_service.Service;


import com.talenthub.application_service.Entity.Document;
import com.talenthub.application_service.Repository.DocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.talenthub.application_service.Exception.ResourceNotFoundException;

import java.util.List;
import java.util.Optional;
// 14. DocumentService.java
@Service
@Transactional
public class DocumentService {

    private final DocumentRepository repository;

    public DocumentService(DocumentRepository repository) {
        this.repository = repository;
    }

    public List<Document> getAllDocuments() {
        return repository.findAll();
    }

    public Optional<Document> getDocumentById(Long id) {
        return repository.findById(id);
    }

    public List<Document> getDocumentsByUtilisateur(Long utilisateurId) {
        return repository.findByUtilisateurId(utilisateurId);
    }

    public List<Document> getDocumentsByProjet(Long projetId) {
        return repository.findByProjetId(projetId);
    }

    public Document createDocument(Document document) {
        return repository.save(document);
    }

    public Document updateDocument(Long id, Document details) {
        Document doc = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document non trouvé avec id: " + id));

        doc.setNom(details.getNom());
        doc.setNomFichier(details.getNomFichier());
        doc.setCheminFichier(details.getCheminFichier());
        doc.setTypeMime(details.getTypeMime());
        doc.setTailleFichier(details.getTailleFichier());
        doc.setVersion(details.getVersion());
        doc.setStatut(details.getStatut());
        doc.setDescription(details.getDescription());
        doc.setEstConfidentiel(details.isEstConfidentiel());
        doc.setDateExpiration(details.getDateExpiration());
        doc.setTypeDocumentId(details.getTypeDocumentId());

        return repository.save(doc);
    }

    public void deleteDocument(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Document non trouvé avec id: " + id);
        }
        repository.deleteById(id);
    }
}
