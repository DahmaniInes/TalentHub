// src/app/shared/models/evaluation-activite.model.ts — MISE À JOUR

export interface EvaluationActivite {
    id: number;
    activiteId: number;
    evaluateurKeycloakId: string;
    evaluateurNom?: string;
    note: number;            // 0 à 5 (étoiles entières)
    commentaire?: string;
    dateCreation?: string;
    dateMiseAJour?: string;
  }
  
  export interface EvaluationActiviteRequest {
    note: number;
    commentaire?: string;
    evaluateurNom?: string;
  }
  
  export interface EvaluationsActiviteResponse {
    evaluations: EvaluationActivite[];
    moyenne: number;
    total: number;
  }
  
  /** ✅ NOUVEAU — résumé batch pour la colonne Évaluation table/kanban */
  export interface EvaluationResume {
    activiteId: number;
    moyenne: number;
    total: number;
  }