// src/app/services/groupe.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Groupe } from '../shared/models/groupe.model';

export interface GroupeRequest {
  nom: string;
  description?: string;
  couleur?: string;
  membresIds?: number[];
  teamLeadId?: number;
  actif?: boolean;
}

@Injectable({ providedIn: 'root' })
export class GroupeService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/groupes';

  getAll(): Observable<Groupe[]> {
    return this.http.get<Groupe[]>(this.base);
  }

  getById(id: number): Observable<Groupe> {
    return this.http.get<Groupe>(`${this.base}/${id}`);
  }

  create(req: GroupeRequest): Observable<Groupe> {
    return this.http.post<Groupe>(this.base, req);
  }

  update(id: number, req: GroupeRequest): Observable<Groupe> {
    return this.http.put<Groupe>(`${this.base}/${id}`, req);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addMembre(groupeId: number, userId: number): Observable<Groupe> {
    return this.http.post<Groupe>(`${this.base}/${groupeId}/membres/${userId}`, {});
  }

  removeMembre(groupeId: number, userId: number): Observable<Groupe> {
    return this.http.delete<Groupe>(`${this.base}/${groupeId}/membres/${userId}`);
  }
}