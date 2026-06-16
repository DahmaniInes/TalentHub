// src/app/shared/models/activite.model.ts — MISE À JOUR
// Changement : priorite (number statique) → prioriteId (id de PrioriteActivite)

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

  // ── PRIORITÉ — dynamique depuis PrioriteActivite ──
  /**
   * ID de la priorité en base (remplace l'ancien champ priorite: number statique).
   * Correspond à PrioriteActivite.id
   */
  prioriteId?: number;
  /** Libellé de la priorité (ex: "Haute") — enrichi côté serveur */
  prioriteLibelle?: string;
  /** Couleur de la priorité (ex: "#f97316") — enrichi côté serveur */
  prioriteCouleur?: string;
  /** Code de la priorité (ex: "HAUTE") — enrichi côté serveur */
  prioriteCode?: string;

  dateEcheance?: string;
  dateDebutReelle?: string;
  dateFinReelle?: string;
  heuresEstimees?: number;
  heuresPassees?: number;
  projets?: ProjetInfoActivite[];

  // Un seul utilisateur assigné (principal)
  utilisateurId?: number;
  utilisateurNomComplet?: string;
  utilisateurPhotoUrl?: string;
  utilisateurPoste?: string;
// Ajouter dans l'interface Activite, après utilisateurPoste :
utilisateurs?: {
  id: number;
  nomComplet: string;
  photoUrl?: string;
  poste?: string;
}[];
  // Groupes assignés
  groupes?: GroupeInfoActivite[];
  creePar?: string;
  dateCreation?: string;
  dateMiseAJour?: string;
  nombreCommentaires?: number;
  nombreDocuments?: number;
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
  /**
   * ID de la PrioriteActivite (remplace l'ancien champ priorite: number).
   */
  prioriteId?: number;
  dateEcheance?: string;
  heuresEstimees?: number;
  heuresPassees?: number;
  utilisateurId?: number;
  groupeIds?: number[];
  // Ajouter dans ActiviteRequest, après groupeIds :
utilisateurIds?: number[];
}