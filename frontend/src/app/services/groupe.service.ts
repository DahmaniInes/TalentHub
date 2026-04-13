import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Groupe, GroupeRequest } from '../shared/models/groupe.model';
 
const BASE = 'http://localhost:8085/api';
 
@Injectable({ providedIn: 'root' })
export class GroupeService {
  private http = inject(HttpClient);
 
  getAll(): Observable<Groupe[]> {
    return this.http.get<Groupe[]>(`${BASE}/groupes`);
  }
 
  getById(id: number): Observable<Groupe> {
    return this.http.get<Groupe>(`${BASE}/groupes/${id}`);
  }
 
  getByMembre(userId: number): Observable<Groupe[]> {
    return this.http.get<Groupe[]>(`${BASE}/groupes/utilisateur/${userId}`);
  }
 
  create(req: GroupeRequest): Observable<Groupe> {
    return this.http.post<Groupe>(`${BASE}/groupes`, req);
  }
 
  update(id: number, req: GroupeRequest): Observable<Groupe> {
    return this.http.put<Groupe>(`${BASE}/groupes/${id}`, req);
  }
 
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/groupes/${id}`);
  }
 
  addMembre(groupeId: number, userId: number): Observable<Groupe> {
    return this.http.post<Groupe>(`${BASE}/groupes/${groupeId}/membres/${userId}`, {});
  }
 
  removeMembre(groupeId: number, userId: number): Observable<Groupe> {
    return this.http.delete<Groupe>(`${BASE}/groupes/${groupeId}/membres/${userId}`);
  }
 
  setTeamLead(groupeId: number, userId: number): Observable<Groupe> {
    return this.http.patch<Groupe>(`${BASE}/groupes/${groupeId}/team-lead`, { userId });
  }
}
 
