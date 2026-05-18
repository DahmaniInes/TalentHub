// src/app/shared/models/projet.model.ts

export interface GroupeInfo {
  id:                  number;
  nom:                 string;
  couleur:             string;
  nombreMembres:       number;
  nombreProjetsActifs: number;
}

export interface Projet {
  id:                          number;
  nom:                         string;
  description?:                string;
  numeroProjet?:               string;
  couleur?:                    string;
  clientId?:                   number;
  clientNom?:                  string;
  dateDebut?:                  string;
  dateFin?:                    string;
  dateFinReelle?:              string;
  statut:                      string;
  avancement:                  number;   // % calculé automatiquement
  budgetPrevu?:                number;
  budgetConsomme?:             number;
  heuresEstimees?:             number;   // quota horaire alloué
  heuresPassees?:              number;   // ✅ heures réellement travaillées
  typeBudget?:                 string;
  seuilAlerteHoraire?:         number;
  visible:                     boolean;
  facturable:                  boolean;
  autoriserActivitesGlobales:  boolean;
  responsableKeycloakId?:      string;
  projetAdmins?:               string[];
  nombreMembres:               number;
  nombreActivites:             number;
  groupes?:                    GroupeInfo[];
  dateCreation?:               string;
}

export interface ProjetRequest {
  nom:                          string;
  description?:                 string;
  couleur?:                     string;
  clientId?:                    number | null;
  statut?:                      string;
  budgetPrevu?:                 number;
  heuresEstimees?:              number;
  typeBudget?:                  string;
  seuilAlerteHoraire?:          number;
  dateDebut?:                   string;
  dateFin?:                     string;
  visible?:                     boolean;
  facturable?:                  boolean;
  autoriserActivitesGlobales?:  boolean;
  responsableKeycloakId?:       string;
  groupeIds?:                   number[];
  activiteIds?:                 number[];
}