import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Demande, DemandeRequest } from '../shared/models/demande.model';

const BASE = 'http://localhost:8085/api/demandes';

@Injectable({ providedIn: 'root' })
export class DemandeService {
  private http = inject(HttpClient);

  getAll(): Observable<Demande[]> {
    return this.http.get<Demande[]>(BASE);
  }
  getByUtilisateur(id: number): Observable<Demande[]> {
    return this.http.get<Demande[]>(`${BASE}/utilisateur/${id}`);
  }
  create(req: DemandeRequest): Observable<Demande> {
    return this.http.post<Demande>(BASE, req);
  }
  update(id: number, req: DemandeRequest): Observable<Demande> {
    return this.http.put<Demande>(`${BASE}/${id}`, req);
  }
  traiter(id: number, statutId: number, traitePar: string, commentaireRH: string): Observable<Demande> {
    return this.http.post<Demande>(`${BASE}/${id}/traiter`, { statutId, traitePar, commentaireRH });
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }
}