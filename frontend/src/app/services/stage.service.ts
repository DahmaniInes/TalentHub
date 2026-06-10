import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Stage } from '../shared/models/stage.model';

@Injectable({ providedIn: 'root' })
export class StageAngularService {

  private http = inject(HttpClient);
  private api  = 'http://localhost:8085/api/stages';

  getByUser(userId: number): Observable<Stage[]> {
    return this.http.get<Stage[]>(`${this.api}/utilisateur/${userId}`);
  }

  getById(id: number): Observable<Stage> {
    return this.http.get<Stage>(`${this.api}/${id}`);
  }

  createStage(userId: number, body: any): Observable<Stage> {
    return this.http.post<Stage>(`${this.api}/utilisateur/${userId}`, body);
  }

  updateStage(id: number, body: any): Observable<Stage> {
    return this.http.put<Stage>(`${this.api}/${id}`, body);
  }

  // ✅ MODIFIÉ — passe un statutStageId (Long) au lieu d'un String
  terminerStage(id: number): Observable<Stage> {
    return this.http.patch<Stage>(`${this.api}/${id}/terminer`, {});
  }

  changerStatut(id: number, statutStageId: number): Observable<Stage> {
    return this.http.patch<Stage>(
        `${this.api}/${id}/statut`, { statutStageId });
  }

  deleteStage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}