import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjetStage } from '../shared/models/projet-stage.model';
import { ActiviteStage } from '../shared/models/activite-stage.model';

@Injectable({ providedIn: 'root' })
export class ProjetStageService {

  private api        = 'http://localhost:8085/api/projets-stage';
  private apiActivite = 'http://localhost:8085/api/activites-stage';

  constructor(private http: HttpClient) {}

  // ── Projets ──
  getAll(): Observable<ProjetStage[]>                      { return this.http.get<ProjetStage[]>(this.api); }
  getById(id: number): Observable<ProjetStage>             { return this.http.get<ProjetStage>(`${this.api}/${id}`); }
  getByStagiaire(id: number): Observable<ProjetStage[]>    { return this.http.get<ProjetStage[]>(`${this.api}/stagiaire/${id}`); }
  getBySuperviseur(id: number): Observable<ProjetStage[]>  { return this.http.get<ProjetStage[]>(`${this.api}/superviseur/${id}`); }
  create(body: any): Observable<ProjetStage>               { return this.http.post<ProjetStage>(this.api, body); }
  update(id: number, body: any): Observable<ProjetStage>   { return this.http.put<ProjetStage>(`${this.api}/${id}`, body); }
  delete(id: number): Observable<void>                     { return this.http.delete<void>(`${this.api}/${id}`); }
  assignerAStagiaire(projetId: number, stagiaireId: number): Observable<ProjetStage> {
    return this.http.patch<ProjetStage>(`${this.api}/${projetId}/assigner/${stagiaireId}`, {});
  }

  // ── Activités ──
  getAllActivites(): Observable<ActiviteStage[]>                       { return this.http.get<ActiviteStage[]>(this.apiActivite); }
  getActiviteById(id: number): Observable<ActiviteStage>              { return this.http.get<ActiviteStage>(`${this.apiActivite}/${id}`); }
  getActivitesByProjet(projetId: number): Observable<ActiviteStage[]> { return this.http.get<ActiviteStage[]>(`${this.apiActivite}/projet/${projetId}`); }
  getActivitesByUser(userId: number): Observable<ActiviteStage[]>     { return this.http.get<ActiviteStage[]>(`${this.apiActivite}/user/${userId}`); }
  createActivite(body: any): Observable<ActiviteStage>                { return this.http.post<ActiviteStage>(this.apiActivite, body); }
  updateActivite(id: number, body: any): Observable<ActiviteStage>    { return this.http.put<ActiviteStage>(`${this.apiActivite}/${id}`, body); }
  deleteActivite(id: number): Observable<void>                        { return this.http.delete<void>(`${this.apiActivite}/${id}`); }
}