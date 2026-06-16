// src/app/shared/models/priorite-activite.model.ts

/**
 * Modèle d'une priorité d'activité (depuis la nomenclature).
 * Remplace l'ancien tableau statique PRIORITES dans les composants.
 */
export interface PrioriteActivite {
    id: number;
    code: string;       // "BASSE" | "NORMALE" | "HAUTE" | "URGENTE" | ...
    libelle: string;    // "Basse" | "Normale" | "Haute" | "Urgente" | ...
    description?: string;
    couleur: string;    // "#10b981"
    ordre: number;      // utilisé pour le tri
    actif: boolean;
  }
  
  export interface PrioriteActiviteRequest {
    code: string;
    libelle: string;
    description?: string;
    couleur?: string;
    ordre: number;
    actif: boolean;
  }