package com.talenthub.application_service.Controller;

import com.talenthub.application_service.Entity.HistoriqueUtilisateur;
import com.talenthub.application_service.Service.HistoriqueUtilisateurService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/historique-utilisateur")
@RequiredArgsConstructor
public class HistoriqueController {

    private final HistoriqueUtilisateurService service;

    // ── Tout l'historique d'un utilisateur ────────────────────────
    // GET /historique-utilisateur/utilisateur/1
    @GetMapping("/utilisateur/{userId}")
    public ResponseEntity<List<HistoriqueUtilisateur>> getHistorique(
            @PathVariable Long userId) {
        return ResponseEntity.ok(service.getHistorique(userId));
    }

    // ── Historique d'un champ précis ──────────────────────────────
    // GET /historique-utilisateur/utilisateur/1/champ/POSTE
    @GetMapping("/utilisateur/{userId}/champ/{champ}")
    public ResponseEntity<List<HistoriqueUtilisateur>> getChamp(
            @PathVariable Long userId,
            @PathVariable String champ) {
        return ResponseEntity.ok(service.getHistoriqueChamp(userId, champ));
    }

    // ── Valeur d'un champ à une date précise ──────────────────────
    // GET /historique-utilisateur/utilisateur/1/champ/POSTE/a-la-date?date=2024-02-15
    @GetMapping("/utilisateur/{userId}/champ/{champ}/a-la-date")
    public ResponseEntity<?> getALaDate(
            @PathVariable Long userId,
            @PathVariable String champ,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.getValeurALaDate(userId, champ, date)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Valeurs entre deux dates ───────────────────────────────────
    // GET /historique-utilisateur/utilisateur/1/champ/POSTE/entre-dates?debut=2024-01-01&fin=2024-03-31
    @GetMapping("/utilisateur/{userId}/champ/{champ}/entre-dates")
    public ResponseEntity<List<HistoriqueUtilisateur>> getEntreDates(
            @PathVariable Long userId,
            @PathVariable String champ,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate debut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return ResponseEntity.ok(
                service.getValeursEntreDates(userId, champ, debut, fin));
    }

    // ── Requête métier : employés par poste entre deux dates ──────
    // GET /historique-utilisateur/poste?valeur=Développeur&debut=2024-01-01&fin=2024-03-31
    @GetMapping("/poste")
    public ResponseEntity<List<HistoriqueUtilisateur>> getEmployesParPoste(
            @RequestParam String valeur,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate debut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {
        return ResponseEntity.ok(
                service.getEmployesParPosteEntreDates(valeur, debut, fin));
    }

    // ── Champs disponibles ────────────────────────────────────────
    @GetMapping("/champs")
    public ResponseEntity<Map<String, String>> getChampsDispo() {
        return ResponseEntity.ok(Map.of(
                "POSTE",            "Poste occupé",
                "PROFIL",           "Profil / rôle système",
                "UNIVERSITE",       "Université (ID nomenclature)",
                "SPECIALITE",       "Spécialité (ID nomenclature)",
                "NIVEAU_ETUDE",     "Niveau d'étude (ID nomenclature)",
                "DATE_FIN_CONTRAT", "Date de fin de contrat"
        ));
    }
}