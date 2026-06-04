// src/app/shared/models/user-creation-request.model.ts
export interface PermissionSelection {
  permissionId: number;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export interface UserCreationRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  dateEmbauche?: string;
  poste?: string;
  departement?: string;
  adresse?: string;
  profilId: number;
  permissions: PermissionSelection[];
  dateFinContrat?: string;
  // Champs académiques (tous profils)
  universite?: string;
  specialite?: string;
  niveauEtude?: string;
  // Champs stage (si profil = stagiaire)
  typeStageId?: number;
  dateDebutStage?: string;
  dateFinStage?: string;
  dateSoutenance?: string;
  superviseurIds?: number[];
}