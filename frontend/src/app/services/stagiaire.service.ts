// src/app/services/stagiaire.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Utilisateur } from '../shared/models/utilisateur.model';

@Injectable({ providedIn: 'root' })
export class StagiaireService {
  private api = 'http://localhost:8085/api/stagiaires';
  private nomenclatureApi = 'http://localhost:8085/api/nomenclature/types-stage';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Utilisateur[]>           { return this.http.get<Utilisateur[]>(this.api); }
  getMes(id: number): Observable<Utilisateur[]> { return this.http.get<Utilisateur[]>(`${this.api}/mes-stagiaires/${id}`); }
  getSuperviseurs(): Observable<Utilisateur[]>  { return this.http.get<Utilisateur[]>(`${this.api}/superviseurs`); }
  update(id: number, body: any): Observable<Utilisateur> { return this.http.patch<Utilisateur>(`${this.api}/${id}`, body); }
  assignerSuperviseurs(id: number, ids: number[]): Observable<Utilisateur> { return this.http.put<Utilisateur>(`${this.api}/${id}/superviseurs`, ids); }
  retirerSuperviseur(id: number, supId: number): Observable<Utilisateur>   { return this.http.delete<Utilisateur>(`${this.api}/${id}/superviseurs/${supId}`); }

  // Types de stage (nomenclature)
  getTypesStage(): Observable<any[]>            { return this.http.get<any[]>(this.nomenclatureApi); }
  createTypeStage(body: any): Observable<any>   { return this.http.post<any>(this.nomenclatureApi, body); }
  updateTypeStage(id: number, body: any): Observable<any> { return this.http.put<any>(`${this.nomenclatureApi}/${id}`, body); }
  deleteTypeStage(id: number): Observable<void> { return this.http.delete<void>(`${this.nomenclatureApi}/${id}`); }
  toggleTypeStage(id: number, actif: boolean): Observable<any> {
    return this.http.patch<any>(`${this.nomenclatureApi}/${id}/${actif ? 'activate' : 'deactivate'}`, {});
  }
}