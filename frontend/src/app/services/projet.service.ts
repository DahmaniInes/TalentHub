// src/app/services/projet.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Projet, ProjetRequest } from '../shared/models/projet.model';

@Injectable({ providedIn: 'root' })
export class ProjetService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/projets';

  getAll(params?: { clientId?: number; statut?: string; membreId?: number }): Observable<Projet[]> {
    let p = new HttpParams();
    if (params?.clientId) p = p.set('clientId', String(params.clientId));
    if (params?.statut)   p = p.set('statut',   params.statut);
    if (params?.membreId) p = p.set('membreId', String(params.membreId));
    return this.http.get<Projet[]>(this.base, { params: p });
  }

  // ✅ Charge le projet COMPLET avec groupes, membres, activités
  getById(id: number): Observable<Projet> {
    return this.http.get<Projet>(`${this.base}/${id}`);
  }

  create(req: ProjetRequest): Observable<Projet> {
    return this.http.post<Projet>(this.base, req);
  }

  update(id: number, req: ProjetRequest): Observable<Projet> {
    return this.http.put<Projet>(`${this.base}/${id}`, req);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ✅ Suppression bulk
  deleteBulk(ids: number[]): Observable<void> {
    return this.http.delete<void>(`${this.base}/bulk`, { body: ids });
  }

assignerActivites(projetId: number, activiteIds: number[]): Observable<Projet> {
  return this.http.patch<Projet>(
      `${this.base}/${projetId}/activites`, activiteIds);
}

}