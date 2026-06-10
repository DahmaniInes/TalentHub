export interface ProjetInfoActivite {
  id: number;
  nom: string;
  couleur?: string;
  numeroProjet?: string;
}

export interface GroupeInfoActivite {
  id: number;
  nom: string;
  couleur: string;
}

export interface Activite {
  id: number;
  nom: string;
  description?: string;
  numeroActivite?: string;
  couleur?: string;
  statutActiviteId: number;
  statutLibelle?: string;
  statutCouleur?: string;
  statutCode?: string;
  budget?: number;
  quotaHoraire?: number;
  typeBudget?: string;
  visible: boolean;
  facturable: boolean;
  estGlobale?: boolean;
  priorite: number;
  prioriteLibelle?: string;
  dateEcheance?: string;
  dateDebutReelle?: string;
  dateFinReelle?: string;
  heuresEstimees?: number;
  heuresPassees?: number;
  projets?: ProjetInfoActivite[];
  utilisateurId?: number;
  utilisateurNomComplet?: string;
  groupes?: GroupeInfoActivite[];
  creePar?: string;
  dateCreation?: string;
  dateMiseAJour?: string;
}

export interface ActiviteRequest {
  nom: string;
  description?: string;
  couleur?: string;
  statutActiviteId?: number;
  budget?: number;
  quotaHoraire?: number;
  typeBudget?: string;
  visible?: boolean;
  facturable?: boolean;
  estGlobale?: boolean;
  priorite?: number;
  dateEcheance?: string;
  heuresEstimees?: number;
  heuresPassees?: number;
  utilisateurId?: number;
  groupeIds?: number[];
}