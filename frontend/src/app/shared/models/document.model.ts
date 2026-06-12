export interface TypeDocument {
    id: number;
    code: string;
    libelle: string;
    extensionsAutorisees?: string;
    actif: boolean;
  }
  
  export interface StatutDocument {
    id: number;
    code: string;       // ACTIF | ARCHIVE | SUPPRIME
    libelle: string;
    couleur?: string;
    actif: boolean;
  }
  
  export interface Document {
    id: number;
    utilisateurId?: number;
    utilisateurNom?: string;
    projetId?: number;
    activiteId?: number;    // ✅ NOUVEAU — lien activité
    stageId?: number;
  
    typeDocumentId: number;
    typeDocumentLibelle?: string;
  
    statutDocumentId: number;       // ✅ ID nomenclature (plus de String)
    statutDocumentCode?: string;    // ACTIF | ARCHIVE | SUPPRIME
    statutDocumentLibelle?: string;
  
    nom: string;
    nomFichier: string;
    cheminFichier?: string;  // URL Cloudinary
    typeMime?: string;
    tailleFichier?: number;
    version: number;
    description?: string;
    estConfidentiel: boolean;
    dateUpload?: string;
    dateExpiration?: string;
  }