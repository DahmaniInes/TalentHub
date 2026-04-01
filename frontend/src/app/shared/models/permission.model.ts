export interface Permission {
    id: number;
    code: string;
    libelle: string;
    module: string;
    description?: string;
    actif: boolean;
  }