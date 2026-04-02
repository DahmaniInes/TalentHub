export interface TypeDemande {
    id: number;
    code: string;
    libelle: string;
    description?: string;
    actif: boolean;
  }
  
  export interface StatutDemande {
    id: number;
    code: string;
    libelle: string;
    couleur?: string;
    actif: boolean;
  }
  
  export interface Demande {
    id: number;
    typeDemandeId: number;
    statutDemandeId: number;
    utilisateurId: number;
    utilisateurNom?: string;
    traitePar?: string;
    sujet: string;
    description?: string;
    dateDebut?: string;
    dateFin?: string;
    nbJours?: number;
    commentaireRH?: string;
    pieceJointeUrl?: string;
    dateCreation?: string;
    dateMiseAJour?: string;
    dateTraitement?: string;
  }
  
  export interface DemandeRequest {
    utilisateurId: number;
    typeDemandeId: number;
    statutDemandeId?: number;
    sujet: string;
    description?: string;
    dateDebut?: string;
    dateFin?: string;
    nbJours?: number;
    commentaireRH?: string;
  }