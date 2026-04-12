// ═══════════════════════════════════════════════════
// src/app/shared/models/client.model.ts
// ═══════════════════════════════════════════════════
export interface Client {
  id: number;
  nom: string;
  description?: string;
  compte?: string;
  idTva?: string;
  devise?: string;
  couleur?: string;
  // Contact
  contact?: string;
  courriel?: string;
  pageAccueil?: string;
  mobile?: string;
  telephone?: string;
  fax?: string;
  // Finance
  budget?: number;
  quotaHoraire?: number;
  typeBudget?: 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL' | 'ILLIMITE';
  // Adresse
  nomSociete?: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
  fuseauHoraire?: string;
  // Flags
  visible: boolean;
  facturable: boolean;
  actif: boolean;
  // Stats
  nombreProjets?: number;
  createdAt?: string;
}
 
export interface ClientRequest {
  nom: string;
  description?: string;
  compte?: string;
  idTva?: string;
  devise?: string;
  couleur?: string;
  contact?: string;
  courriel?: string;
  pageAccueil?: string;
  mobile?: string;
  telephone?: string;
  fax?: string;
  budget?: number;
  quotaHoraire?: number;
  typeBudget?: string;
  nomSociete?: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
  fuseauHoraire?: string;
  visible?: boolean;
  facturable?: boolean;
  actif?: boolean;
}
 