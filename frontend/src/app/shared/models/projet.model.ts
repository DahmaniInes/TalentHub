// src/app/shared/models/projet.model.ts

export interface GroupeInfo {
  id:                  number;
  nom:                 string;
  couleur:             string;
  nombreMembres:       number;
  nombreProjetsActifs: number;   // ✅ NOUVEAU — enrichi par le backend
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
  avancement:                  number;
  budgetPrevu?:                number;
  budgetConsomme?:             number;
  quotaHoraire?:               number;       // ✅ NOUVEAU dans formulaire
  typeBudget?:                 string;
  seuilAlerteHoraire?:         number;       // ✅ NOUVEAU — seuil en %
  visible:                     boolean;
  facturable:                  boolean;
  autoriserActivitesGlobales:  boolean;
  responsableKeycloakId?:      string;
  projetAdmins?:               string[];
  nombreMembres:               number;
  nombreActivites:             number;
  groupes?:                    GroupeInfo[]; // ✅ NOUVEAU — équipes assignées
  dateCreation?:               string;
}

export interface ProjetRequest {
  nom:                          string;
  description?:                 string;
  couleur?:                     string;
  clientId?:                    number | null;
  statut?:                      string;
  budgetPrevu?:                 number;
  quotaHoraire?:                number;       // ✅ NOUVEAU
  typeBudget?:                  string;
  seuilAlerteHoraire?:          number;       // ✅ NOUVEAU
  dateDebut?:                   string;
  dateFin?:                     string;
  visible?:                     boolean;
  facturable?:                  boolean;
  autoriserActivitesGlobales?:  boolean;
  responsableKeycloakId?:       string;
  groupeIds?:                   number[];     // ✅ NOUVEAU — IDs des groupes
}