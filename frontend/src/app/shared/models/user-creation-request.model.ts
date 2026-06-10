export interface UserCreationRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  dateEmbauche?: string | null;
  poste?: string | null;
  departement?: string | null;
  adresse?: string | null;
  profilId: number;
  dateFinContrat?: string | null;

  // Académique — IDs vers nomenclature
  universiteId?: number | null;
  specialiteId?: number | null;
  niveauEtudeId?: number | null;

  // Stage
  typeStageId?: number | null;
  dateDebutStage?: string | null;
  dateFinStage?: string | null;
  dateSoutenance?: string | null;
}