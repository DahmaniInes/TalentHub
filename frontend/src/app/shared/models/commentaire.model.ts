// src/app/shared/models/commentaire.model.ts
export interface Commentaire {
    id:               number;
    contenu:          string;
    auteurKeycloakId: string;
    auteurNom:        string;
    auteurPhotoUrl?:  string;
    projetId?:        number;
    activiteId?:      number;
    groupeId?:        number;
    groupeNom?:       string;
    dateCreation:     string;
    dateMiseAJour?:   string;
    edite:            boolean;
  }
  
  export interface CommentaireRequest {
    contenu:        string;
    auteurNom:      string;
    auteurPhotoUrl?: string;
    groupeId?:      number;
  }