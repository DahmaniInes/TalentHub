// src/app/shared/models/notification.model.ts — COMPLET FINAL
export type NotificationType =
  // ── Feuilles de temps ──
  | 'FEUILLE_SOUMISE'
  | 'FEUILLE_VALIDEE'
  | 'FEUILLE_REJETEE'
  | 'FEUILLE_ANNULEE'
  | 'FEUILLE_MODIFIEE'
  // ── Demandes ──
  | 'DEMANDE_SOUMISE'
  | 'DEMANDE_VALIDEE'
  | 'DEMANDE_REJETEE'
  | 'DEMANDE_ANNULEE'
  // ── Réclamations ──
  | 'RECLAMATION_SOUMISE'
  | 'RECLAMATION_RESOLUE'
  | 'RECLAMATION_REJETEE'
  | 'RECLAMATION_COMMENTEE'
  | 'RECLAMATION_MISE_A_JOUR'
  // ── Commentaires Projet ──
  | 'PROJET_COMMENTAIRE'
  | 'PROJET_COMMENTAIRE_REPONSE'
  // ── Commentaires Activité ──
  | 'ACTIVITE_COMMENTAIRE'
  | 'ACTIVITE_COMMENTAIRE_REPONSE'
  // ── Projets ──
  | 'PROJET_ASSIGNE'
  | 'PROJET_STATUT_CHANGE'
  // ── Activités ──
  | 'ACTIVITE_ASSIGNEE'
  | 'ACTIVITE_STATUT_CHANGE'
  // ── Général ──
  | 'INFO'
  | 'ALERTE'
  | 'RAPPEL'
  | 'NOTIFICATION_SEND_MANUAL';

export interface AppNotification {
  id:             number;
  destinataireId: string;
  type:           NotificationType;
  titre:          string;
  description:    string;
  lien:           string;
  ressourceId:    number;
  lu:             boolean;
  dateCreation:   string;
}