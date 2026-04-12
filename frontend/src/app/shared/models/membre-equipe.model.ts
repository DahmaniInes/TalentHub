export type RoleMembre = 'MEMBRE' | 'LEAD' | 'OBSERVATEUR' | 'ADMIN';
 
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
}
 
export interface AddMembreRequest {
  projetId: number;
  utilisateurId: number;
  role?: RoleMembre;
  quotaHoraire?: number;
}
 
 
