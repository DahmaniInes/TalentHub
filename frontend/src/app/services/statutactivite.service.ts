// src/app/services/statutactivite.service.ts
// ✅ Le service s'appelle StatutActiviteService (pas NomenclatureService)
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StatutActivite } from '../shared/models/statut-activite.model';

const NOMEN_BASE = 'http://localhost:8085/api';

@Injectable({ providedIn: 'root' })
export class StatutActiviteService {
  private http = inject(HttpClient);

  getStatutsActivite(): Observable<StatutActivite[]> {
    return this.http.get<StatutActivite[]>(`${NOMEN_BASE}/statut-activite`);
  }

  getById(id: number): Observable<StatutActivite> {
    return this.http.get<StatutActivite>(`${NOMEN_BASE}/statut-activite/${id}`);
  }

  create(s: Partial<StatutActivite>): Observable<StatutActivite> {
    return this.http.post<StatutActivite>(`${NOMEN_BASE}/statut-activite`, s);
  }

  update(id: number, s: Partial<StatutActivite>): Observable<StatutActivite> {
    return this.http.put<StatutActivite>(`${NOMEN_BASE}/statut-activite/${id}`, s);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${NOMEN_BASE}/statut-activite/${id}`);
  }
}