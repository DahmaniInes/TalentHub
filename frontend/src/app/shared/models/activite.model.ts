// src/app/shared/models/activite.model.ts

export interface Activite {
  id:                  number;
  nom:                 string;
  description?:        string;
  numeroActivite?:     string;
  couleur?:            string;
  statutActiviteId:    number;
  statutLibelle?:      string;   // enrichi par le backend
  statutCouleur?:      string;   // enrichi par le backend
  statutCode?:         string;
  budget?:             number;
  quotaHoraire?:       number;
  typeBudget?:         string;
  visible:             boolean;
  facturable:          boolean;
  priorite:            number;
  prioriteLibelle?:    string;
  dateEcheance?:       string;
  dateDebutReelle?:    string;
  dateFinReelle?:      string;
  heuresEstimees?:     number;
  heuresPassees?:      number;
  projetId?:           number;    // null = activité globale
  projetNom?:          string;
  utilisateurId?:      number;
  utilisateurNomComplet?: string;
  creePar?:            string;
  dateCreation?:       string;
  dateMiseAJour?:      string;
}

export interface ActiviteRequest {
  nom:               string;
  description?:      string;
  couleur?:          string;
  statutActiviteId?: number;
  budget?:           number;
  quotaHoraire?:     number;
  typeBudget?:       string;
  visible?:          boolean;
  facturable?:       boolean;
  priorite?:         number;
  dateEcheance?:     string;
  heuresEstimees?:   number;
  projetId?:         number;     // null = activité globale
  utilisateurId?:    number;
}