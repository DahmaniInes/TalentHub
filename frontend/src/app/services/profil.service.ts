import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Profil } from '../shared/models/profil.model';

@Injectable({
  providedIn: 'root'
})
export class ProfilService {

  private apiUrl = 'http://localhost:8085/api/application/profils';   // via API Gateway

  constructor(private http: HttpClient) {}

  getAllProfils(): Observable<Profil[]> {
    return this.http.get<Profil[]>(this.apiUrl);
  }

  getProfilById(id: number): Observable<Profil> {
    return this.http.get<Profil>(`${this.apiUrl}/${id}`);
  }
}