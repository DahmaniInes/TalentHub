// src/app/services/nomenclature-academique.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Universite, Specialite, NiveauEtude } from '../shared/models/nomenclature-academique.model';

@Injectable({ providedIn: 'root' })
export class NomenclatureAcademiqueService {

  private base = 'http://localhost:8085/api/nomenclature';

  constructor(private http: HttpClient) {}

  // ── Universités ──
  getUniversites(): Observable<Universite[]>          { return this.http.get<Universite[]>(`${this.base}/universites/actifs`); }
  getAllUniversites(): Observable<Universite[]>        { return this.http.get<Universite[]>(`${this.base}/universites`); }
  createUniversite(body: any): Observable<Universite> { return this.http.post<Universite>(`${this.base}/universites`, body); }
  updateUniversite(id: number, body: any): Observable<Universite> { return this.http.put<Universite>(`${this.base}/universites/${id}`, body); }
  toggleUniversite(id: number, actif: boolean): Observable<Universite> {
    return this.http.patch<Universite>(`${this.base}/universites/${id}/${actif ? 'activate' : 'deactivate'}`, {});
  }
  deleteUniversite(id: number): Observable<void>      { return this.http.delete<void>(`${this.base}/universites/${id}`); }
  // Créer ou retrouver par libellé (depuis formulaires)
  createOrGetUniversite(libelle: string): Observable<Universite> {
    return this.http.post<Universite>(`${this.base}/universites/create-or-get`, { libelle });
  }

  // ── Spécialités ──
  getSpecialites(): Observable<Specialite[]>          { return this.http.get<Specialite[]>(`${this.base}/specialites/actifs`); }
  getAllSpecialites(): Observable<Specialite[]>        { return this.http.get<Specialite[]>(`${this.base}/specialites`); }
  createSpecialite(body: any): Observable<Specialite> { return this.http.post<Specialite>(`${this.base}/specialites`, body); }
  updateSpecialite(id: number, body: any): Observable<Specialite> { return this.http.put<Specialite>(`${this.base}/specialites/${id}`, body); }
  toggleSpecialite(id: number, actif: boolean): Observable<Specialite> {
    return this.http.patch<Specialite>(`${this.base}/specialites/${id}/${actif ? 'activate' : 'deactivate'}`, {});
  }
  deleteSpecialite(id: number): Observable<void>      { return this.http.delete<void>(`${this.base}/specialites/${id}`); }
  createOrGetSpecialite(libelle: string): Observable<Specialite> {
    return this.http.post<Specialite>(`${this.base}/specialites/create-or-get`, { libelle });
  }

  // ── Niveaux d'étude ──
  getNiveaux(): Observable<NiveauEtude[]>             { return this.http.get<NiveauEtude[]>(`${this.base}/niveaux-etude/actifs`); }
  getAllNiveaux(): Observable<NiveauEtude[]>           { return this.http.get<NiveauEtude[]>(`${this.base}/niveaux-etude`); }
  createNiveau(body: any): Observable<NiveauEtude>    { return this.http.post<NiveauEtude>(`${this.base}/niveaux-etude`, body); }
  updateNiveau(id: number, body: any): Observable<NiveauEtude> { return this.http.put<NiveauEtude>(`${this.base}/niveaux-etude/${id}`, body); }
  toggleNiveau(id: number, actif: boolean): Observable<NiveauEtude> {
    return this.http.patch<NiveauEtude>(`${this.base}/niveaux-etude/${id}/${actif ? 'activate' : 'deactivate'}`, {});
  }
  deleteNiveau(id: number): Observable<void>          { return this.http.delete<void>(`${this.base}/niveaux-etude/${id}`); }
}