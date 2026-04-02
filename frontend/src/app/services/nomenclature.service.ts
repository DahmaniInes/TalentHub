import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TypeDemande, StatutDemande } from '../shared/models/demande.model';

const BASE = 'http://localhost:8085/api/nomenclature';

@Injectable({ providedIn: 'root' })
export class NomenclatureService {
  private http = inject(HttpClient);

  // ── Types de demande ──
  getAllTypes(): Observable<TypeDemande[]> {
    return this.http.get<TypeDemande[]>(`${BASE}/types-demande`);
  }
  getTypesActifs(): Observable<TypeDemande[]> {
    return this.http.get<TypeDemande[]>(`${BASE}/types-demande/actifs`);
  }
  createType(req: Partial<TypeDemande>): Observable<TypeDemande> {
    return this.http.post<TypeDemande>(`${BASE}/types-demande`, req);
  }
  updateType(id: number, req: Partial<TypeDemande>): Observable<TypeDemande> {
    return this.http.put<TypeDemande>(`${BASE}/types-demande/${id}`, req);
  }
  deleteType(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/types-demande/${id}`);
  }

  // ── Statuts de demande ──
  getAllStatuts(): Observable<StatutDemande[]> {
    return this.http.get<StatutDemande[]>(`${BASE}/statuts-demande`);
  }
  getStatutsActifs(): Observable<StatutDemande[]> {
    return this.http.get<StatutDemande[]>(`${BASE}/statuts-demande/actifs`);
  }
  createStatut(req: Partial<StatutDemande>): Observable<StatutDemande> {
    return this.http.post<StatutDemande>(`${BASE}/statuts-demande`, req);
  }
  updateStatut(id: number, req: Partial<StatutDemande>): Observable<StatutDemande> {
    return this.http.put<StatutDemande>(`${BASE}/statuts-demande/${id}`, req);
  }
  deleteStatut(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/statuts-demande/${id}`);
  }
}