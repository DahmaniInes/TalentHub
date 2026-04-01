export interface Profil {
    id: number;
    nom: string;           // ex: "ADMIN", "RH", "MANAGER", "EMPLOYE"
    description?: string;
    actif: boolean;
  }