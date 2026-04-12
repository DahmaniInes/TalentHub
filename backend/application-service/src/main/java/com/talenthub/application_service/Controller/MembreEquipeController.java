package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.MembreEquipeDTO;
import com.talenthub.application_service.Service.MembreEquipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/membres-equipe")
@RequiredArgsConstructor
public class MembreEquipeController {

    private final MembreEquipeService membreService;

    @GetMapping("/projet/{projetId}")
    public ResponseEntity<List<MembreEquipeDTO>> getByProjet(@PathVariable Long projetId) {
        return ResponseEntity.ok(
                membreService.getByProjet(projetId).stream().map(MembreEquipeDTO::new).toList()
        );
    }

    @GetMapping("/utilisateur/{userId}")
    public ResponseEntity<List<MembreEquipeDTO>> getByUtilisateur(@PathVariable Long userId) {
        return ResponseEntity.ok(
                membreService.getByUtilisateur(userId).stream().map(MembreEquipeDTO::new).toList()
        );
    }

    @PostMapping
    public ResponseEntity<MembreEquipeDTO> addMembre(@RequestBody Map<String, Object> body) {
        Long projetId      = Long.valueOf(body.get("projetId").toString());
        Long utilisateurId = Long.valueOf(body.get("utilisateurId").toString());
        String role        = body.containsKey("role") ? body.get("role").toString() : "MEMBRE";
        Double quota       = body.containsKey("quotaHoraire")
                ? Double.valueOf(body.get("quotaHoraire").toString()) : null;
        return new ResponseEntity<>(
                new MembreEquipeDTO(membreService.addMembre(projetId, utilisateurId, role, quota)),
                HttpStatus.CREATED
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<MembreEquipeDTO> updateRole(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        String role   = body.containsKey("role") ? body.get("role").toString() : "MEMBRE";
        Double quota  = body.containsKey("quotaHoraire")
                ? Double.valueOf(body.get("quotaHoraire").toString()) : null;
        return ResponseEntity.ok(new MembreEquipeDTO(membreService.updateRole(id, role, quota)));
    }

    @DeleteMapping("/projet/{projetId}/utilisateur/{userId}")
    public ResponseEntity<Void> removeMembre(
            @PathVariable Long projetId, @PathVariable Long userId) {
        membreService.removeMembre(projetId, userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        membreService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
