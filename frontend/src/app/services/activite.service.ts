import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Activite, ActiviteRequest } from '../shared/models/activite.model';
 
@Injectable({ providedIn: 'root' })
export class ActiviteService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/activites';
 
  getByProjet(projetId: number, statutId?: number): Observable<Activite[]> {
    let params = new HttpParams();
    if (statutId) params = params.set('statutId', String(statutId));
    return this.http.get<Activite[]>(`${this.base}/projet/${projetId}`, { params });
  }
 
  getByUtilisateur(userId: number): Observable<Activite[]> {
    return this.http.get<Activite[]>(`${this.base}/utilisateur/${userId}`);
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
 
  // ✅ changerStatut reçoit un Long statutId, pas une string enum
  changerStatut(id: number, statutId: number): Observable<Activite> {
    return this.http.patch<Activite>(`${this.base}/${id}/statut`, { statutId });
  }
 
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
 
 