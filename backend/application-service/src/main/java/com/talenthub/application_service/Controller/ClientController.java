package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.ClientDTO;
import com.talenthub.application_service.Entity.Client;
import com.talenthub.application_service.Service.ClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;

    @GetMapping
    public ResponseEntity<List<ClientDTO>> getAll(
            @RequestParam(required = false) Boolean actif) {
        List<Client> list = (actif != null && actif)
                ? clientService.getAllActifs()
                : clientService.getAll();
        return ResponseEntity.ok(list.stream().map(ClientDTO::new).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new ClientDTO(clientService.getByIdWithProjets(id)));
    }

    @PostMapping
    public ResponseEntity<ClientDTO> create(@RequestBody Client client) {
        return new ResponseEntity<>(new ClientDTO(clientService.create(client)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClientDTO> update(@PathVariable Long id, @RequestBody Client client) {
        return ResponseEntity.ok(new ClientDTO(clientService.update(id, client)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        clientService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle-actif")
    public ResponseEntity<ClientDTO> toggleActif(@PathVariable Long id) {
        return ResponseEntity.ok(new ClientDTO(clientService.toggleActif(id)));
    }
}