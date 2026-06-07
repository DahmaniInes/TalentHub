export interface StagiaireMin {
  id: number;
  nomComplet: string;
  email: string;
  photoUrl?: string;
}

export interface ProjetStage {
  id: number;
  titre: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  avancement: number;
  statut: 'EN_COURS' | 'TERMINE' | 'SUSPENDU';
  createdAt?: string;
  // Compatibilité
  stagiaireIds?: number[];
  stagiaireNoms?: string[];
  // Objets complets pour affichage avatar
  stagiaires?: StagiaireMin[];
  nombreActivites?: number;
  activitesTerminees?: number;
}