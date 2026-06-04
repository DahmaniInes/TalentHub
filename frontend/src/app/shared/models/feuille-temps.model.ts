// src/app/shared/models/feuille-temps.model.ts
// BD stocke : projet_id, activite_id, client_id uniquement
// Backend résout les noms et les retourne dans le DTO
// Angular envoie uniquement les IDs au backend

export type StatutFT = 'BROUILLON' | 'SOUMISE' | 'VALIDEE' | 'REJETEE';

// ─── Ligne REÇUE du backend (DTO) ────────────────────────────────────────────
// Le backend résout les noms depuis les IDs → Angular les reçoit dans le DTO
export interface LigneFeuilleTemps {
  id?: number;
  date: string;

  projetId?: number;
  projetNom?: string;     // résolu côté backend, jamais en BD

  activiteId?: number;
  activiteNom?: string;   // résolu côté backend, jamais en BD

  clientId?: number;
  clientNom?: string;     // résolu côté backend, jamais en BD

  heureDebut?: string;
  heureFin?: string;

  minutesTravaillees: number;
  minutesSupplementaires: number;

  commentaire?: string;
  estWeekend?: boolean;
}

// ─── Feuille de temps reçue du backend ───────────────────────────────────────
export interface FeuilleTemps {
  id: number;
  utilisateurId: number;
  utilisateurNom?: string;
  semaineDu: string;
  semaineAu: string;
  heuresTravaillees?: number;
  minutesTravaillees: number;        // ← supprimer le ?
  minutesSupplementaires: number;    // ← supprimer le ?
  statut: StatutFT;
  commentaireEmploye?: string;
  commentaireValideur?: string;
  validePar?: string;
  dateValidation?: string;
  lignes: LigneFeuilleTemps[];       // déjà non-optionnel ✅
}

// ─── Request envoyé AU backend ────────────────────────────────────────────────
// ✅ IDs uniquement — AUCUN nom (projetNom, activiteNom, clientNom supprimés)
export interface LigneFeuilleTempsRequest {
  date: string;

  projetId?: number;
  // projetNom SUPPRIMÉ ← backend résout depuis projetId

  activiteId?: number;
  // activiteNom SUPPRIMÉ ← backend résout depuis activiteId

  clientId?: number;
  // clientNom SUPPRIMÉ ← backend résout depuis clientId

  heureDebut?: string;
  heureFin?: string;

  minutesTravaillees: number;
  minutesSupplementaires: number;

  commentaire?: string;
  estWeekend?: boolean;
}

export interface FeuilleTempsRequest {
  utilisateurId: number;
  semaineDu: string;
  semaineAu: string;
  minutesTravaillees?: number;
  minutesSupplementaires?: number;
  statut?: string;
  commentaireEmploye?: string;
  lignes: LigneFeuilleTempsRequest[];
}

// ─── Vue matrice Ma Semaine (état local frontend uniquement) ──────────────────
export interface MatriceLigne {
  rowId: string;
  projetId?: number;
  projetNom?: string;    // stocké localement dans le composant (depuis le select)
  activiteId?: number;
  activiteNom?: string;  // stocké localement dans le composant (depuis le select)
  clientId?: number;
  clientNom?: string;    // stocké localement dans le composant
  jours: {
    [dateStr: string]: {
      minutes: number;
      minutesSupp: number;
      heureDebut: string;
      heureFin: string;
      commentaire: string;
      estWeekend: boolean;
    };
  };
}