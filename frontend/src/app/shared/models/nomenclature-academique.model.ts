export interface Universite {
  id: number;
  code: string;
  libelle: string;
  description?: string;
  actif: boolean;
}

export interface Specialite {
  id: number;
  code: string;
  libelle: string;
  description?: string;
  actif: boolean;
}

export interface NiveauEtude {
  id: number;
  code: string;
  libelle: string;
  description?: string;
  ordreAffichage?: number;
  actif: boolean;
}

export interface StatutStage {
  id: number;
  code: string;
  libelle: string;
  couleur?: string;
  ordreAffichage?: number;
  actif: boolean;
}