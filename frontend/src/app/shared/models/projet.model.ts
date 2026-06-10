export interface GroupeInfo {
  id: number;
  nom: string;
  couleur: string;
  nombreMembres: number;
  nombreProjetsActifs: number;
}

export interface StagiaireMembreDTO {
  id: number;
  nomComplet: string;
  email: string;
  photoUrl?: string;
  stageId?: number;
  role?: string;
}

export interface StatutProjet {
  id: number;
  code: string;
  libelle: string;
  couleur?: string;
  ordreAffichage?: number;
  actif: boolean;
}

export interface TypeProjet {
  id: number;
  code: string;
  libelle: string;
  description?: string;
  actif: boolean;
}

export interface Projet {
  id: number;
  nom: string;
  description?: string;
  numeroProjet?: string;
  couleur?: string;
  clientId?: number;
  clientNom?: string;
  dateDebut?: string;
  dateFin?: string;
  dateFinReelle?: string;
  statutProjetId?: number;
  typeProjetId?: number;
  avancement: number;
  budgetPrevu?: number;
  budgetConsomme?: number;
  heuresEstimees?: number;
  heuresPassees?: number;
  typeBudget?: string;
  seuilAlerteHoraire?: number;
  visible: boolean;
  facturable: boolean;
  autoriserActivitesGlobales: boolean;
  responsableKeycloakId?: string;
  projetAdmins?: string[];
  nombreMembres: number;
  nombreActivites: number;
  groupes?: GroupeInfo[];
  dateCreation?: string;
  stagiaires?: StagiaireMembreDTO[];
}

export interface ProjetRequest {
  nom: string;
  description?: string;
  couleur?: string;
  clientId?: number | null;
  statutProjetId?: number;
  typeProjetId?: number;
  budgetPrevu?: number;
  heuresEstimees?: number;
  typeBudget?: string;
  seuilAlerteHoraire?: number;
  dateDebut?: string;
  dateFin?: string;
  visible?: boolean;
  facturable?: boolean;
  autoriserActivitesGlobales?: boolean;
  responsableKeycloakId?: string;
  groupeIds?: number[];
  activiteIds?: number[];
  avancement?: number;
}