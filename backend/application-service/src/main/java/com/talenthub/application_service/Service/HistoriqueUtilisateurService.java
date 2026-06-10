package com.talenthub.application_service.Service;

import com.talenthub.application_service.Entity.HistoriqueUtilisateur;
import com.talenthub.application_service.Entity.Utilisateur;
import com.talenthub.application_service.Repository.HistoriqueUtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class HistoriqueUtilisateurService {

    private final HistoriqueUtilisateurRepository repo;

    // ── Constantes des champs archivables ────────────────────────
    public static final String POSTE            = "POSTE";
    public static final String PROFIL           = "PROFIL";
    public static final String UNIVERSITE       = "UNIVERSITE";
    public static final String SPECIALITE       = "SPECIALITE";
    public static final String NIVEAU_ETUDE     = "NIVEAU_ETUDE";
    public static final String DATE_FIN_CONTRAT = "DATE_FIN_CONTRAT";

    // ── Enregistrer un changement ────────────────────────────────
    public void enregistrerChangement(Utilisateur utilisateur,
                                      String champ,
                                      String ancienneValeur,
                                      String nouvelleValeur,
                                      String modifiePar) {
        // Pas de changement → rien à archiver
        if (Objects.equals(ancienneValeur, nouvelleValeur)) return;

        LocalDate aujourd = LocalDate.now();

        // Clore l'entrée active (dateFin = hier)
        repo.findValeurActuelle(utilisateur.getId(), champ)
                .ifPresent(actuelle -> {
                    actuelle.setDateFin(aujourd.minusDays(1));
                    repo.save(actuelle);
                });

        // Créer la nouvelle entrée
        HistoriqueUtilisateur h = new HistoriqueUtilisateur();
        h.setUtilisateur(utilisateur);
        h.setChamp(champ);
        h.setAncienneValeur(ancienneValeur);
        h.setNouvelleValeur(nouvelleValeur);
        h.setDateDebut(aujourd);
        h.setDateFin(null); // null = valeur actuelle
        h.setModifiePar(modifiePar);
        repo.save(h);
    }

    // ── Enregistrer plusieurs changements d'un coup ───────────────
    public void enregistrerChangements(Utilisateur utilisateur,
                                       java.util.Map<String, String[]> champOldNew,
                                       String modifiePar) {
        // champOldNew : { "POSTE" -> ["ancien", "nouveau"], ... }
        champOldNew.forEach((champ, values) ->
                enregistrerChangement(utilisateur, champ,
                        values[0], values[1], modifiePar));
    }

    // ── Lecture ───────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<HistoriqueUtilisateur> getHistorique(Long userId) {
        return repo.findByUtilisateurId(userId);
    }

    @Transactional(readOnly = true)
    public List<HistoriqueUtilisateur> getHistoriqueChamp(Long userId,
                                                          String champ) {
        return repo.findByUtilisateurIdAndChamp(userId, champ);
    }

    @Transactional(readOnly = true)
    public Optional<HistoriqueUtilisateur> getValeurALaDate(Long userId,
                                                            String champ,
                                                            LocalDate date) {
        return repo.findValeurALaDate(userId, champ, date);
    }

    @Transactional(readOnly = true)
    public List<HistoriqueUtilisateur> getValeursEntreDates(Long userId,
                                                            String champ,
                                                            LocalDate debut,
                                                            LocalDate fin) {
        return repo.findValeursEntreDates(userId, champ, debut, fin);
    }

    // ── Requêtes métier ───────────────────────────────────────────

    // "Quels employés avaient le poste X entre Jan et Mars ?"
    @Transactional(readOnly = true)
    public List<HistoriqueUtilisateur> getEmployesParPosteEntreDates(
            String poste, LocalDate debut, LocalDate fin) {
        return repo.findParValeurEntreDates(POSTE, poste, debut, fin);
    }

    // "Quel était le profil de cet utilisateur le 15 février ?"
    @Transactional(readOnly = true)
    public Optional<String> getProfilALaDate(Long userId, LocalDate date) {
        return repo.findValeurALaDate(userId, PROFIL, date)
                .map(HistoriqueUtilisateur::getNouvelleValeur);
    }
}