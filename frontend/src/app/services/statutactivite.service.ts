import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StatutActivite } from '../shared/models/statut-activite.model';

const BASE = 'http://localhost:8085/api/nomenclature/statut-activite';

@Injectable({ providedIn: 'root' })
export class StatutActiviteService {

  private http = inject(HttpClient);

  // ✅ Alias utilisé par tous les composants existants
  getStatutsActivite(): Observable<StatutActivite[]> {
    return this.http.get<StatutActivite[]>(BASE);
  }

  getAll(): Observable<StatutActivite[]> {
    return this.http.get<StatutActivite[]>(BASE);
  }

  getActifs(): Observable<StatutActivite[]> {
    return this.http.get<StatutActivite[]>(`${BASE}/actifs`);
  }

  getById(id: number): Observable<StatutActivite> {
    return this.http.get<StatutActivite>(`${BASE}/${id}`);
  }

  getByCode(code: string): Observable<StatutActivite> {
    return this.http.get<StatutActivite>(`${BASE}/code/${code}`);
  }

  create(body: Partial<StatutActivite>): Observable<StatutActivite> {
    return this.http.post<StatutActivite>(BASE, body);
  }

  update(id: number, body: Partial<StatutActivite>): Observable<StatutActivite> {
    return this.http.put<StatutActivite>(`${BASE}/${id}`, body);
  }

  activate(id: number): Observable<StatutActivite> {
    return this.http.patch<StatutActivite>(`${BASE}/${id}/activate`, {});
  }

  deactivate(id: number): Observable<StatutActivite> {
    return this.http.patch<StatutActivite>(`${BASE}/${id}/deactivate`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }
}