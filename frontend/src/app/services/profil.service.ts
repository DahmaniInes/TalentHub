import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Profil } from '../shared/models/profil.model';

@Injectable({
  providedIn: 'root'
})
export class ProfilService {




  
  private apiUrl = environment.apiUrl + '/api/application/profils';   // via API Gateway

  constructor(private http: HttpClient) {}

  getAllProfils(): Observable<Profil[]> {
    return this.http.get<Profil[]>(this.apiUrl);
  }

  getProfilById(id: number): Observable<Profil> {
    return this.http.get<Profil>(`${this.apiUrl}/${id}`);
  }
}
