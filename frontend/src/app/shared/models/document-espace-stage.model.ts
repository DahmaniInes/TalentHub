// src/app/shared/models/document-espace-stage.model.ts — NOUVEAU

export type CategorieDocumentStage = 'PROJET' | 'ACTIVITE' | 'GENERAL';
export type VisibilitePour = 'TOUS_STAGE' | 'ADMIN_ONLY' | 'STAGIAIRE_ID';

export interface DocumentEspaceStage {
  id: number;
  nom: string;
  nomFichier: string;
  cheminFichier?: string;
  typeMime?: string;
  tailleFichier?: number;
  description?: string;
  dateUpload: string;

  // Contexte d'appartenance
  projetId?: number;
  projetNom?: string;
  activiteId?: number;
  activiteNom?: string;

  // Portée pour les documents généraux
  visiblePour: VisibilitePour;
  destinataireId?: number;
  destinataireNomComplet?: string;

  // Uploadeur
  utilisateurId?: number;
  utilisateurNomComplet?: string;
  utilisateurPhotoUrl?: string;

  categorie: CategorieDocumentStage;
}