export type StatutFT = 'BROUILLON' | 'SOUMISE' | 'VALIDEE' | 'REJETEE';

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
}