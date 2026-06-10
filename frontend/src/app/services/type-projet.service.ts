import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TypeProjet } from '../shared/models/projet.model';

const BASE = 'http://localhost:8085/api/nomenclature/type-projet';

@Injectable({ providedIn: 'root' })
export class TypeProjetService {

  private http = inject(HttpClient);

  getAll(): Observable<TypeProjet[]> {
    return this.http.get<TypeProjet[]>(BASE);
  }

  getActifs(): Observable<TypeProjet[]> {
    return this.http.get<TypeProjet[]>(`${BASE}/actifs`);
  }

  getById(id: number): Observable<TypeProjet> {
    return this.http.get<TypeProjet>(`${BASE}/${id}`);
  }

  create(body: Partial<TypeProjet>): Observable<TypeProjet> {
    return this.http.post<TypeProjet>(BASE, body);
  }

  update(id: number, body: Partial<TypeProjet>): Observable<TypeProjet> {
    return this.http.put<TypeProjet>(`${BASE}/${id}`, body);
  }

  activate(id: number): Observable<TypeProjet> {
    return this.http.patch<TypeProjet>(`${BASE}/${id}/activate`, {});
  }

  deactivate(id: number): Observable<TypeProjet> {
    return this.http.patch<TypeProjet>(`${BASE}/${id}/deactivate`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }
}