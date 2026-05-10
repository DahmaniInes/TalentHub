import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client, ClientRequest } from '../shared/models/client.model';
 
@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private base = 'http://localhost:8085/api/clients';
 
  getAll(actif?: boolean): Observable<Client[]> {
    let params = new HttpParams();
    if (actif !== undefined) params = params.set('actif', String(actif));
    return this.http.get<Client[]>(this.base, { params });
  }
 
  getById(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.base}/${id}`);
  }
 
  create(req: ClientRequest): Observable<Client> {
    return this.http.post<Client>(this.base, req);
  }
 
  update(id: number, req: Partial<ClientRequest>): Observable<Client> {
    return this.http.put<Client>(`${this.base}/${id}`, req);
  }
 
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
 
  toggleActif(id: number): Observable<Client> {
    return this.http.patch<Client>(`${this.base}/${id}/toggle-actif`, {});
  }
  
}
 