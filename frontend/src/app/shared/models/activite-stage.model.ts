// src/app/shared/models/activite-stage.model.ts
export interface ActiviteStage {
    id: number;
    titre: string;
    description?: string;
    dateDebut?: string;
    dateFin?: string;
    avancement: number;
    statut: 'A_FAIRE' | 'EN_COURS' | 'TERMINE';
    commentaire?: string;
    projetId?: number;
    projetTitre?: string;
    createurId?: number;
    createurNom?: string;
    assigneId?: number;
    assigneNom?: string;
    createdAt?: string;
  }