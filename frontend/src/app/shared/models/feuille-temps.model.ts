export type StatutFT = 'BROUILLON' | 'SOUMISE' | 'VALIDEE' | 'REJETEE';
export type CategorieFT = 'TRAVAIL' | 'CONGE' | 'MALADIE' | 'FERIE' | 'AUTRE';

export interface LigneFeuilleTemps {
  id?: number;
  date: string;            // "YYYY-MM-DD"
  categorieCode: CategorieFT;
  heureDebut?: string;     // "08:00"
  heureFin?: string;       // "17:00"
  minutesNormales: number;
  minutesSupplementaires: number;
  minutesAbsence: number;
  commentaire?: string;
  totalMinutes?: number;   // calculé par le backend
}

export interface FeuilleTemps {
  id: number;
  utilisateurId: number;
  utilisateurNom: string;
  semaineDu: string;
  semaineAu: string;
  minutesTravaillees: number;
  minutesSupplementaires: number;
  minutesAbsence: number;
  statut: StatutFT;
  commentaireEmploye?: string;
  commentaireValideur?: string;
  validePar?: string;
  dateValidation?: string;
  dateCreation?: string;
  dateMiseAJour?: string;
  lignes: LigneFeuilleTemps[];
}

export interface FeuilleTempsRequest {
  utilisateurId: number;
  semaineDu: string;
  semaineAu: string;
  minutesTravaillees: number;
  minutesSupplementaires: number;
  minutesAbsence: number;
  statut?: string;
  commentaireEmploye?: string;
  lignes: LigneFeuilleTemps[];
}