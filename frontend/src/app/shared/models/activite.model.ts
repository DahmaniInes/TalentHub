//export type StatutActivite = 'A_FAIRE' | 'EN_COURS' | 'EN_REVUE' | 'TERMINE' | 'BLOQUE' | 'ANNULE';
 
export interface Activite {
  id: number;
  nom: string;
  description?: string;
  numeroActivite?: string;
  couleur?: string;
  // ✅ statutActiviteId = Long (FK vers nomenclature)
  statutActiviteId: number;
  // Enrichis par le backend via Feign
  statutLibelle?: string;
  statutCouleur?: string;
  statutCode?: string;
  // Finance
  budget?: number;
  quotaHoraire?: number;
  typeBudget?: string;
  // Flags
  visible: boolean;
  facturable: boolean;
  // Priorité
  priorite: number;
  prioriteLibelle?: string;
  // Dates
  dateEcheance?: string;
  dateDebutReelle?: string;
  dateFinReelle?: string;
  // Temps
  heuresEstimees?: number;
  heuresPassees?: number;
  // Relations
  projetId?: number;
  projetNom?: string;
  utilisateurId?: number;
  utilisateurNomComplet?: string;
  creePar?: string;
  dateCreation?: string;
  dateMiseAJour?: string;
}
 
export interface ActiviteRequest {
  nom: string;
  description?: string;
  couleur?: string;
  statutActiviteId?: number;   // ✅ Long ID
  budget?: number;
  quotaHoraire?: number;
  typeBudget?: string;
  visible?: boolean;
  facturable?: boolean;
  priorite?: number;
  dateEcheance?: string;
  heuresEstimees?: number;
  projetId?: number;
  utilisateurId?: number;
  creePar?: string;
}