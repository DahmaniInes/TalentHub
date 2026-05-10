// src/app/shared/models/notification.model.ts

export type NotificationType = 'FEUILLE_SOUMISE' | 'FEUILLE_VALIDEE' | 'FEUILLE_REJETEE'  | 'DEMANDE_SOUMISE' |  'DEMANDE_VALIDEE' | 'DEMANDE_REJETEE' ;


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