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
    nomComplet?: string;           // calculé par le backend
    profilId: number; 
    profilNom: string; 
    createdAt?: string;
    updatedAt?: string;

  }