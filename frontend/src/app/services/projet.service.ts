import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Projet, ProjetRequest,
  StatutProjet, TypeProjet
} from '../shared/models/projet.model';

@Injectable({ providedIn: 'root' })
export class ProjetService {

  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/projets';
  private nomenclatureBase = 'http://localhost:8085/api/nomenclature';

  getAll(params?: {
    clientId?: number;
    statutId?: number;
    membreId?: number;
  }): Observable<Projet[]> {
    let p = new HttpParams();
    if (params?.clientId) p = p.set('clientId', String(params.clientId));
    if (params?.statutId) p = p.set('statutId', String(params.statutId));
    if (params?.membreId) p = p.set('membreId', String(params.membreId));
    return this.http.get<Projet[]>(this.base, { params: p });
  }

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

  deleteBulk(ids: number[]): Observable<void> {
    return this.http.delete<void>(`${this.base}/bulk`, { body: ids });
  }

  assignerActivites(projetId: number, activiteIds: number[]): Observable<Projet> {
    return this.http.patch<Projet>(
        `${this.base}/${projetId}/activites`, activiteIds);
  }

  // Projets de stage
  getProjetsStage(): Observable<Projet[]> {
    return this.http.get<Projet[]>(`${this.base}/stage`);
  }

  getProjetsParStagiaire(utilisateurId: number): Observable<Projet[]> {
    return this.http.get<Projet[]>(
        `${this.base}/stagiaire/${utilisateurId}`);
  }

  getProjetsParSuperviseur(superviseurId: number): Observable<Projet[]> {
    return this.http.get<Projet[]>(
        `${this.base}/superviseur/${superviseurId}`);
  }

  // Nomenclature
  getStatutsProjet(): Observable<StatutProjet[]> {
    return this.http.get<StatutProjet[]>(
        `${this.nomenclatureBase}/statut-projet/actifs`);
  }

  getAllStatutsProjet(): Observable<StatutProjet[]> {
    return this.http.get<StatutProjet[]>(
        `${this.nomenclatureBase}/statut-projet`);
  }

  getTypesProjet(): Observable<TypeProjet[]> {
    return this.http.get<TypeProjet[]>(
        `${this.nomenclatureBase}/type-projet/actifs`);
  }
}