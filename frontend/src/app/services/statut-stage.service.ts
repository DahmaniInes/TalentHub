import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StatutStage } from '../shared/models/nomenclature-academique.model';

const BASE = 'http://localhost:8085/api/nomenclature/statut-stage';

@Injectable({ providedIn: 'root' })
export class StatutStageService {

  private http = inject(HttpClient);

  getAll(): Observable<StatutStage[]> {
    return this.http.get<StatutStage[]>(BASE);
  }

  getActifs(): Observable<StatutStage[]> {
    return this.http.get<StatutStage[]>(`${BASE}/actifs`);
  }

  getById(id: number): Observable<StatutStage> {
    return this.http.get<StatutStage>(`${BASE}/${id}`);
  }

  create(body: Partial<StatutStage>): Observable<StatutStage> {
    return this.http.post<StatutStage>(BASE, body);
  }

  update(id: number, body: Partial<StatutStage>): Observable<StatutStage> {
    return this.http.put<StatutStage>(`${BASE}/${id}`, body);
  }

  activate(id: number): Observable<StatutStage> {
    return this.http.patch<StatutStage>(`${BASE}/${id}/activate`, {});
  }

  deactivate(id: number): Observable<StatutStage> {
    return this.http.patch<StatutStage>(`${BASE}/${id}/deactivate`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }
}