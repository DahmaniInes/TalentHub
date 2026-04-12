package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.Client;
import com.talenthub.application_service.Repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;

    @Transactional(readOnly = true)
    public List<Client> getAll() {
        return clientRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Client> getAllActifs() {
        return clientRepository.findByActifTrue();
    }

    @Transactional(readOnly = true)
    public Client getById(Long id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Client non trouvé: " + id));
    }

    @Transactional(readOnly = true)
    public Client getByIdWithProjets(Long id) {
        return clientRepository.findByIdWithProjets(id)
                .orElseThrow(() -> new RuntimeException("Client non trouvé: " + id));
    }

    @Transactional
    public Client create(Client client) {
        return clientRepository.save(client);
    }

    @Transactional
    public Client update(Long id, Client details) {
        Client existing = getById(id);
        existing.setNom(details.getNom());
        existing.setDescription(details.getDescription());
        existing.setCompte(details.getCompte());
        existing.setIdTva(details.getIdTva());
        existing.setDevise(details.getDevise());
        existing.setCouleur(details.getCouleur());
        existing.setContact(details.getContact());
        existing.setCourriel(details.getCourriel());
        existing.setPageAccueil(details.getPageAccueil());
        existing.setMobile(details.getMobile());
        existing.setTelephone(details.getTelephone());
        existing.setFax(details.getFax());
        existing.setBudget(details.getBudget());
        existing.setQuotaHoraire(details.getQuotaHoraire());
        existing.setTypeBudget(details.getTypeBudget());
        existing.setNomSociete(details.getNomSociete());
        existing.setCodePostal(details.getCodePostal());
        existing.setVille(details.getVille());
        existing.setPays(details.getPays());
        existing.setFuseauHoraire(details.getFuseauHoraire());
        existing.setVisible(details.isVisible());
        existing.setFacturable(details.isFacturable());
        existing.setActif(details.isActif());
        return clientRepository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        clientRepository.deleteById(id);
    }

    @Transactional
    public Client toggleActif(Long id) {
        Client c = getById(id);
        c.setActif(!c.isActif());
        return clientRepository.save(c);
    }
}