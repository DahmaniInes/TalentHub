export interface SuperviseurMin {
  id: number;
  nomComplet: string;
  email: string;
  photoUrl?: string;
  poste?: string;
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
  // Académique
  universite?: string;
  specialite?: string;
  niveauEtude?: string;
  // Stage
  typeStageId?: number;
  dateDebutStage?: string;
  dateFinStage?: string;
  dateSoutenance?: string;
  // Superviseurs — compatibilité
  superviseurIds?: number[];
  superviseurNoms?: string[];
  // Superviseurs — objets complets
  superviseurs?: SuperviseurMin[];
}