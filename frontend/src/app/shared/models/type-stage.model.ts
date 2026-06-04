// src/app/shared/models/type-stage.model.ts
export interface TypeStage {
    id: number;
    code: string;
    libelle: string;
    description?: string;
    dureeMinSemaines?: number;
    dureeMaxSemaines?: number;
    actif: boolean;
  }