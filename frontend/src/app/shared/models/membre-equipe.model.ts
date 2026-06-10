export type RoleMembre = 'MEMBRE' | 'LEAD' | 'OBSERVATEUR' | 'ADMIN' | 'STAGIAIRE';

export interface MembreEquipe {
  id: number;
  projetId?: number;
  projetNom?: string;
  utilisateurId: number;
  utilisateurNom?: string;
  utilisateurPrenom?: string;
  utilisateurEmail?: string;
  utilisateurPhotoUrl?: string;
  role: RoleMembre;
  quotaHoraire?: number;
  dateAjout?: string;
  actif: boolean;
  stageId?: number;  // null = employé, défini = stagiaire
}

export interface AddMembreRequest {
  projetId: number;
  utilisateurId: number;
  role?: RoleMembre;
  quotaHoraire?: number;
}

export interface AddStagiaireRequest {
  projetId: number;
  utilisateurId: number;
  stageId?: number;
  quotaHoraire?: number;
}