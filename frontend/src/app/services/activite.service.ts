import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Activite, ActiviteRequest } from '../shared/models/activite.model';

@Injectable({ providedIn: 'root' })
export class ActiviteService {

  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/application/activites';

  getAll(params?: {
    statutId?: number;
    utilisateurId?: number;
    priorite?: number;
    globalesUniquement?: boolean;
  }): Observable<Activite[]> {
    let p = new HttpParams();
    if (params?.statutId)           p = p.set('statutId',           String(params.statutId));
    if (params?.utilisateurId)      p = p.set('utilisateurId',      String(params.utilisateurId));
    if (params?.priorite)           p = p.set('priorite',           String(params.priorite));
    if (params?.globalesUniquement) p = p.set('globalesUniquement', 'true');
    return this.http.get<Activite[]>(this.base, { params: p });
  }

  getGlobales(): Observable<Activite[]> {
    return this.http.get<Activite[]>(`${this.base}/globales`);
  }

  getByProjet(projetId: number): Observable<Activite[]> {
    return this.http.get<Activite[]>(`${this.base}/projet/${projetId}`);
  }

  getById(id: number): Observable<Activite> {
    return this.http.get<Activite>(`${this.base}/${id}`);
  }

  create(req: ActiviteRequest): Observable<Activite> {
    return this.http.post<Activite>(this.base, req);
  }

  update(id: number, req: ActiviteRequest): Observable<Activite> {
    return this.http.put<Activite>(`${this.base}/${id}`, req);
  }

  changerStatut(id: number, statutId: number): Observable<Activite> {
    return this.http.patch<Activite>(`${this.base}/${id}/statut`, { statutId });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  deleteBulk(ids: number[]): Observable<void> {
    return this.http.delete<void>(`${this.base}/bulk`, { body: ids });
  }
}