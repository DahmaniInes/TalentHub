import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StatutProjet } from '../shared/models/projet.model';

const BASE = 'http://localhost:8085/api/nomenclature/statut-projet';

@Injectable({ providedIn: 'root' })
export class StatutProjetService {

  private http = inject(HttpClient);

  getAll(): Observable<StatutProjet[]> {
    return this.http.get<StatutProjet[]>(BASE);
  }

  getActifs(): Observable<StatutProjet[]> {
    return this.http.get<StatutProjet[]>(`${BASE}/actifs`);
  }

  getById(id: number): Observable<StatutProjet> {
    return this.http.get<StatutProjet>(`${BASE}/${id}`);
  }

  create(body: Partial<StatutProjet>): Observable<StatutProjet> {
    return this.http.post<StatutProjet>(BASE, body);
  }

  update(id: number, body: Partial<StatutProjet>): Observable<StatutProjet> {
    return this.http.put<StatutProjet>(`${BASE}/${id}`, body);
  }

  activate(id: number): Observable<StatutProjet> {
    return this.http.patch<StatutProjet>(`${BASE}/${id}/activate`, {});
  }

  deactivate(id: number): Observable<StatutProjet> {
    return this.http.patch<StatutProjet>(`${BASE}/${id}/deactivate`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }
}