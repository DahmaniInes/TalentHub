export interface SuperviseurMin {
  id: number;
  nomComplet: string;
  email: string;
  photoUrl?: string;
  poste?: string;
}

export interface StageMin {
  id: number;
  utilisateurId: number;
  typeStageId?: number;
  statutStageId?: number;
  dateDebut?: string;
  dateFin?: string;
  dateSoutenance?: string;
  description?: string;
  createdAt?: string;
  projetIds?: number[];
}

export interface StagiaireMembreMin {
  id: number;
  nomComplet: string;
  email: string;
  photoUrl?: string;
  stageId?: number;
  role?: string;
}

export interface Utilisateur {
  id: number;
  keycloakId: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  dateNaissance?: string;
  dateEmbauche?: string;
  dateFinContrat?: string;
  poste?: string;
  departement?: string;
  adresse?: string;
  photoUrl?: string;
  actif: boolean;
  nomComplet?: string;
  profilId: number;
  profilNom: string;
  createdAt?: string;
  updatedAt?: string;

  // ✅ Académique — IDs vers nomenclature (plus de Strings libres)
  universiteId?: number;
  specialiteId?: number;
  niveauEtudeId?: number;

  // ✅ Stages — liste (un user peut avoir plusieurs stages)
  stages?: StageMin[];

  // ✅ Superviseurs
  superviseurIds?: number[];
  superviseurNoms?: string[];
  superviseurs?: SuperviseurMin[];

  // ✅ Projets de stage via membresEquipe
  projetsStage?: StagiaireMembreMin[];
}