export interface MembreInfo {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    photoUrl?: string;
    poste?: string;
  }
   
  export interface Groupe {
    id: number;
    nom: string;
    description?: string;
    couleur?: string;
    teamLeadId?: number;
    teamLeadNom?: string;
    teamLeadPrenom?: string;
    actif: boolean;
    nombreMembres?: number;
    membres?: MembreInfo[];
    createdAt?: string;
  }
   
  export interface GroupeRequest {
    nom: string;
    description?: string;
    couleur?: string;
    teamLeadId?: number;
    actif?: boolean;
    membresIds?: number[];
  }
   
   