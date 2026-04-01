export interface ProfilPermission {
    id: number;
    profilId: number;
    permissionId: number;
    permissionCode: string;
    permissionLibelle: string;
    permissionModule: string;
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canExport: boolean;
  }