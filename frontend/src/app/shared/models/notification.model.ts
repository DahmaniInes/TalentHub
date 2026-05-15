// src/app/shared/models/notification.model.ts — COMPLET FINAL
export type NotificationType =
  | 'FEUILLE_SOUMISE'
  | 'FEUILLE_VALIDEE'
  | 'FEUILLE_REJETEE'
  | 'FEUILLE_ANNULEE'
  | 'FEUILLE_MODIFIEE'   // ✅ NOUVEAU — feuille modifiée par un tiers
  | 'DEMANDE_SOUMISE'
  | 'DEMANDE_VALIDEE'
  | 'DEMANDE_REJETEE'
  | 'DEMANDE_ANNULEE'
  | 'INFO'
  | 'ALERTE'
  | 'RAPPEL';

export interface AppNotification {
  id: number;
  destinataireId: string;
  type: NotificationType;
  titre: string;
  description: string;
  lien: string;
  ressourceId: number;
  lu: boolean;
  dateCreation: string;
}