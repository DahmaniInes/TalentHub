export interface StatutActivite {
    id: number;
    code: string;
    libelle: string;
    couleur: string;  // ex: "#10b981"
    ordre: number;
    actif: boolean;
  }