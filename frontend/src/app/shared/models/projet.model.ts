export type StatutProjet = 'PLANIFIE' | 'EN_COURS' | 'SUSPENDU' | 'TERMINE' | 'ANNULE';
export type TypeBudget   = 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL' | 'ILLIMITE';
 
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
  statut: StatutProjet;
  avancement: number;
  budgetPrevu?: number;
  budgetConsomme?: number;
  quotaHoraire?: number;
  typeBudget?: TypeBudget;
  visible: boolean;
  facturable: boolean;
  autoriserActivitesGlobales: boolean;
  responsableKeycloakId?: string;
  projetAdmins?: string[];
  nombreMembres?: number;
  nombreActivites?: number;
  dateCreation?: string;
}
 
export interface ProjetRequest {
  nom: string;
  description?: string;
  couleur?: string;
  clientId?: number;
  dateDebut?: string;
  dateFin?: string;
  statut?: StatutProjet;
  budgetPrevu?: number;
  quotaHoraire?: number;
  typeBudget?: TypeBudget;
  visible?: boolean;
  facturable?: boolean;
  autoriserActivitesGlobales?: boolean;
  responsableKeycloakId?: string;
}
 