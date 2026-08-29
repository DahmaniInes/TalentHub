package com.talenthub.application_service.Controller;

import com.talenthub.application_service.DTO.JourFerieDTO;
import com.talenthub.application_service.Service.JourFerieService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/jours-feries")
public class JoursFerieController {

    private final JourFerieService jourFerieService;

    public JoursFerieController(JourFerieService jourFerieService) {
        this.jourFerieService = jourFerieService;
    }

    @GetMapping("/{annee}")
    public ResponseEntity<List<JourFerieDTO>> getJoursFeries(@PathVariable int annee) {
        return ResponseEntity.ok(jourFerieService.getJoursFeries(annee));
    }
}