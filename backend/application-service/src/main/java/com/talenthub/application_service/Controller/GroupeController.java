package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.GroupeDTO;
import com.talenthub.application_service.DTO.GroupeRequest;
import com.talenthub.application_service.Service.GroupeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/groupes")
@RequiredArgsConstructor
public class GroupeController {

    private final GroupeService groupeService;

    @GetMapping
    public ResponseEntity<List<GroupeDTO>> getAll() {
        return ResponseEntity.ok(
                groupeService.getAll().stream().map(GroupeDTO::new).toList()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupeDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(new GroupeDTO(groupeService.getById(id)));
    }

    @GetMapping("/utilisateur/{userId}")
    public ResponseEntity<List<GroupeDTO>> getByMembre(@PathVariable Long userId) {
        return ResponseEntity.ok(
                groupeService.getByMembre(userId).stream().map(GroupeDTO::new).toList()
        );
    }

    @PostMapping
    public ResponseEntity<GroupeDTO> create(@RequestBody GroupeRequest req) {
        return new ResponseEntity<>(new GroupeDTO(groupeService.create(req)), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<GroupeDTO> update(@PathVariable Long id, @RequestBody GroupeRequest req) {
        return ResponseEntity.ok(new GroupeDTO(groupeService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        groupeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/membres/{userId}")
    public ResponseEntity<GroupeDTO> addMembre(@PathVariable Long id, @PathVariable Long userId) {
        return ResponseEntity.ok(new GroupeDTO(groupeService.addMembre(id, userId)));
    }

    @DeleteMapping("/{id}/membres/{userId}")
    public ResponseEntity<GroupeDTO> removeMembre(@PathVariable Long id, @PathVariable Long userId) {
        return ResponseEntity.ok(new GroupeDTO(groupeService.removeMembre(id, userId)));
    }

    @PatchMapping("/{id}/team-lead")
    public ResponseEntity<GroupeDTO> setTeamLead(
            @PathVariable Long id, @RequestBody Map<String, Long> body) {
        return ResponseEntity.ok(new GroupeDTO(groupeService.setTeamLead(id, body.get("userId"))));
    }
}

