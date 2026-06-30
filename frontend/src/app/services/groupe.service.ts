// src/app/services/groupe.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

// ✅ NOUVEAU — forme exacte renvoyée par /coequipiers/{id} et
// /tous-membres : correspond à GroupeDTO.MembreInfo côté backend (DTO
// léger déjà existant, pas l'entité Utilisateur complète).
export interface MembreInfo {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  photoUrl?: string;
  poste?: string;
  keycloakId?: string;   // ✅ AJOUTÉ

}

@Injectable({ providedIn: 'root' })
export class GroupeService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/application/groupes';

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

  /**
   * ✅ NOUVEAU — Dropdown Utilisateur de Ma Semaine, cas TS_GROUP_READ/
   * UPDATE : tous les coéquipiers de l'utilisateur connecté (membres
   * distincts de tous les groupes auxquels il appartient, lui exclu).
   */
  getCoequipiers(utilisateurId: number): Observable<MembreInfo[]> {
    return this.http.get<MembreInfo[]>(`${this.base}/coequipiers/${utilisateurId}`);
  }

  /**
   * ✅ NOUVEAU — Dropdown Utilisateur de Ma Semaine, cas TS_ALL_READ/
   * UPDATE : tous les utilisateurs membres d'au moins un groupe dans toute
   * l'application (l'utilisateur connecté exclu).
   */
  getTousMembresDeGroupes(utilisateurConnecteId: number): Observable<MembreInfo[]> {
    const params = new HttpParams().set('utilisateurConnecteId', String(utilisateurConnecteId));
    return this.http.get<MembreInfo[]>(`${this.base}/tous-membres`, { params });
  }
}