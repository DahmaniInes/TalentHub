
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
    dateEmbauche?: string;        // format : "YYYY-MM-DD"
    poste?: string;
    departement?: string;
    adresse?: string;
    profilId: number;
    permissions: PermissionSelection[];  // ✅ Ajouter

  }