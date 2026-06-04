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
  // Champs académiques
  universite?: string;
  specialite?: string;
  niveauEtude?: string;
  // Champs stage
  typeStageId?: number;
  dateDebutStage?: string;
  dateFinStage?: string;
  dateSoutenance?: string;
  superviseurIds?: number[];
  superviseurNoms?: string[];
}