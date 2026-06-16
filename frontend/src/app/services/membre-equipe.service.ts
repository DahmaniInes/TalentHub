import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MembreEquipe, AddMembreRequest } from '../shared/models/membre-equipe.model';
 
@Injectable({ providedIn: 'root' })
export class MembreEquipeService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/application/membres-equipe';
 
  getByProjet(projetId: number): Observable<MembreEquipe[]> {
    return this.http.get<MembreEquipe[]>(`${this.base}/projet/${projetId}`);
  }
 
  getByUtilisateur(userId: number): Observable<MembreEquipe[]> {
    return this.http.get<MembreEquipe[]>(`${this.base}/utilisateur/${userId}`);
  }
 
  addMembre(req: AddMembreRequest): Observable<MembreEquipe> {
    return this.http.post<MembreEquipe>(this.base, req);
  }
 
  updateRole(id: number, role: string, quotaHoraire?: number): Observable<MembreEquipe> {
    return this.http.put<MembreEquipe>(`${this.base}/${id}`, { role, quotaHoraire });
  }
 
  removeMembre(projetId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/projet/${projetId}/utilisateur/${userId}`);
  }
 
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}