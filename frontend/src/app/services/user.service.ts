import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserCreationRequest } from '../shared/models/user-creation-request.model';
import { Utilisateur } from '../shared/models/utilisateur.model';
import { KeycloakService } from './keycloak.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = 'http://localhost:8085/api/utilisateurs';   // via API Gateway
  private keycloakService = inject(KeycloakService);   // ← Ajoute cette ligne en haut avec les autres imports
  constructor(private http: HttpClient) {}

  createUser(request: UserCreationRequest): Observable<Utilisateur> {
    return this.http.post<Utilisateur>(this.apiUrl, request);
  }

  getAllUsers(): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>(this.apiUrl);
  }

  getUserById(id: number): Observable<Utilisateur> {
    return this.http.get<Utilisateur>(`${this.apiUrl}/${id}`);
  }



  updateUserProfile(updates: any): Observable<any> {
    const keycloakId = this.keycloakService.getKeycloakUserId();   // ← Nous allons injecter KeycloakService

    if (!keycloakId) {
      throw new Error('Utilisateur Keycloak non trouvé');
    }

    return this.http.patch(`${this.apiUrl}/keycloak/${keycloakId}/profile`, updates);
  }

  updateUserProfileWithPhoto(formData: FormData): Observable<any> {
    const keycloakId = this.keycloakService.getKeycloakUserId();
    return this.http.patch(`${this.apiUrl}/keycloak/${keycloakId}/profile`, formData);
  }


  getUserByKeycloakId(keycloakId: string): Observable<Utilisateur> {
    return this.http.get<Utilisateur>(`${this.apiUrl}/keycloak/${keycloakId}`);
  }




  toggleActif(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/toggle-actif`, {});
  }
 
  resetPassword(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/reset-password`, {});
  }
 
  updateByAdmin(id: number, body: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, body);
  }
 
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}