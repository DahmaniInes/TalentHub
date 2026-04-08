import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FeuilleTemps, FeuilleTempsRequest } from '../shared/models/feuille-temps.model';

const BASE = 'http://localhost:8085/api/feuilles-temps';

@Injectable({ providedIn: 'root' })
export class FeuilleTempsService {
  private http = inject(HttpClient);

  getAll(): Observable<FeuilleTemps[]> { return this.http.get<FeuilleTemps[]>(BASE); }
  getById(id: number): Observable<FeuilleTemps> { return this.http.get<FeuilleTemps>(`${BASE}/${id}`); }
  getByUtilisateur(id: number): Observable<FeuilleTemps[]> { return this.http.get<FeuilleTemps[]>(`${BASE}/utilisateur/${id}`); }

  // ✅ Toutes les feuilles soumises pour les approbateurs
  getSoumises(): Observable<FeuilleTemps[]> { return this.http.get<FeuilleTemps[]>(`${BASE}/approbations`); }

  create(req: FeuilleTempsRequest): Observable<FeuilleTemps> { return this.http.post<FeuilleTemps>(BASE, req); }
  update(id: number, req: FeuilleTempsRequest): Observable<FeuilleTemps> { return this.http.put<FeuilleTemps>(`${BASE}/${id}`, req); }
  soumettre(id: number): Observable<FeuilleTemps> { return this.http.post<FeuilleTemps>(`${BASE}/${id}/soumettre`, {}); }

  // ✅ Annuler la soumission
  annulerSoumission(id: number): Observable<FeuilleTemps> {
    return this.http.post<FeuilleTemps>(`${BASE}/${id}/annuler-soumission`, {});
  }

  valider(id: number, valideurId: string, commentaire: string): Observable<FeuilleTemps> {
    return this.http.post<FeuilleTemps>(`${BASE}/${id}/valider`, { valideurId, commentaire });
  }

  rejeter(id: number, valideurId: string, commentaire: string): Observable<FeuilleTemps> {
    return this.http.post<FeuilleTemps>(`${BASE}/${id}/rejeter`, { valideurId, commentaire });
  }

  delete(id: number): Observable<void> { return this.http.delete<void>(`${BASE}/${id}`); }

  static formatMinutes(min: number): string {
    if (!min || min <= 0) return '0h';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  static getLundiSemaine(date = new Date()): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  static getVendrediSemaine(lundi: string): string {
    const d = new Date(lundi);
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  }

  
}