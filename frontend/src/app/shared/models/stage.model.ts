export interface Stage {
    id: number;
    utilisateurId: number;
    typeStageId?: number;
    statutStageId?: number;  // ID vers statut_stage dans nomenclature
    dateDebut?: string;
    dateFin?: string;
    dateSoutenance?: string;
    description?: string;
    createdAt?: string;
    projetIds?: number[];
  }
  
  export interface StageRequest {
    typeStageId?: number;
    statutStageId?: number;
    dateDebut?: string;
    dateFin?: string;
    dateSoutenance?: string;
    description?: string;
  }