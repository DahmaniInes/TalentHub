// src/app/shared/models/feuille-temps.model.ts

export type StatutFT = 'BROUILLON' | 'SOUMISE' | 'VALIDEE' | 'REJETEE';

// ─── Ligne (entrée de temps par projet/activité/jour) ───
export interface LigneFeuilleTemps {
  id?: number;
  date: string;              // "YYYY-MM-DD"

  projetId?: number;
  projetNom?: string;
  activiteId?: number;
  activiteNom?: string;
  clientId?: number;
  clientNom?: string;

  heureDebut?: string;       // "08:00"
  heureFin?: string;         // "17:00"

  minutesTravaillees: number;
  minutesSupplementaires: number;

  commentaire?: string;
  estWeekend?: boolean;
}

// ─── Feuille de temps ───
export interface FeuilleTemps {
  id: number;
  utilisateurId: number;
  utilisateurNom?: string;
  semaineDu: string;         // "YYYY-MM-DD" (lundi)
  semaineAu: string;         // "YYYY-MM-DD" (vendredi ou samedi)
  minutesTravaillees: number;
  minutesSupplementaires: number;
  minutesAbsence?: number;
  heuresTravaillees?: number;
  statut: StatutFT;
  commentaireEmploye?: string;
  commentaireValideur?: string;
  validePar?: string;
  dateValidation?: string;
  dateCreation?: string;
  dateMiseAJour?: string;
  lignes: LigneFeuilleTemps[];
}

// ─── Request ───
export interface LigneFeuilleTempsRequest {
  date: string;
  projetId?: number;
  projetNom?: string;
  activiteId?: number;
  activiteNom?: string;
  clientId?: number;
  clientNom?: string;
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

// ─── Vue matrice Ma Semaine ───
export interface MatriceLigne {
  rowId: string;             // uuid temporaire pour identifier la ligne
  projetId?: number;
  projetNom?: string;
  activiteId?: number;
  activiteNom?: string;
  clientId?: number;
  clientNom?: string;
  // Jours : lundi(0) → samedi(5)
  jours: {
    [dateStr: string]: {    // "YYYY-MM-DD"
      minutes: number;
      minutesSupp: number;
      heureDebut: string;
      heureFin: string;
      commentaire: string;
      estWeekend: boolean;
    };
  };
}