// src/app/services/evaluation-activite.service.ts — MISE À JOUR
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EvaluationActivite,
  EvaluationActiviteRequest,
  EvaluationsActiviteResponse,
  EvaluationResume
} from '../shared/models/evaluationactivite.model';

@Injectable({ providedIn: 'root' })
export class EvaluationActiviteService {

  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/application/activites';

  getByActivite(activiteId: number): Observable<EvaluationsActiviteResponse> {
    return this.http.get<EvaluationsActiviteResponse>(
        `${this.base}/${activiteId}/evaluations`);
  }

  /**
   * ✅ NOUVEAU — Résumé (moyenne + total) pour TOUTES les activités d'un
   * projet en un seul appel, utilisé par la colonne "Évaluation" de la
   * table/kanban (évite un appel par activité).
   */
  getResumeByProjet(projetId: number): Observable<EvaluationResume[]> {
    return this.http.get<EvaluationResume[]>(
        `${this.base}/projet/${projetId}/evaluations-resume`);
  }

  /** Upsert : crée l'évaluation de l'utilisateur courant si absente, sinon la met à jour. */
  evaluer(activiteId: number, req: EvaluationActiviteRequest): Observable<EvaluationActivite> {
    return this.http.post<EvaluationActivite>(
        `${this.base}/${activiteId}/evaluations`, req);
  }

  /** Supprime UNIQUEMENT l'évaluation de l'utilisateur courant (vérifié côté backend). */
  supprimer(activiteId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${activiteId}/evaluations`);
  }
}