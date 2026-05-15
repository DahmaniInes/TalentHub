// src/app/shared/models/reclamation.model.ts

export interface Reclamation {
    id:                   number;
    serviceReclamationId: number;
    serviceNom?:          string;   // enrichi côté frontend
    statutReclamationId:  number;
    statutNom?:           string;   // enrichi côté frontend
    statutCode?:          string;
    utilisateurId:        number;
    utilisateurNom?:      string;
    utilisateurEmail?:    string;
    traitePar?:           string;
    sujet:                string;
    description?:         string;
    pieceJointeUrl?:      string;
    commentaireTraitement?: string;
    commentaires:         CommentaireReclamation[];
    dateCreation:         string;
    dateMiseAJour?:       string;
    dateTraitement?:      string;
  }
  
  export interface CommentaireReclamation {
    id:               number;
    auteurKeycloakId: string;
    auteurNom?:       string;
    estAdmin:         boolean;
    contenu:          string;
    dateCreation:     string;
  }
  
  export interface ReclamationRequest {
    utilisateurId:        number;
    serviceReclamationId: number;
    statutReclamationId?: number;
    sujet:                string;
    description?:         string;
    pieceJointeUrl?:      string;
  }
  
  export interface ServiceReclamation {
    id:          number;
    code:        string;
    libelle:     string;
    description?: string;
    actif:       boolean;
  }
  
  export interface StatutReclamation {
    id:          number;
    code:        string;
    libelle:     string;
    description?: string;
    actif:       boolean;
  }