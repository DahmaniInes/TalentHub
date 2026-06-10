import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserCreationRequest } from '../shared/models/user-creation-request.model';
import { Utilisateur } from '../shared/models/utilisateur.model';
import { KeycloakService } from './keycloak.service';

@Injectable({ providedIn: 'root' })
export class UserService {

  private http           = inject(HttpClient);
  private keycloakService = inject(KeycloakService);

  private apiUrl = 'http://localhost:8085/api/utilisateurs';

  createUser(request: UserCreationRequest): Observable<Utilisateur> {
    return this.http.post<Utilisateur>(this.apiUrl, request);
  }

  getAllUsers(): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>(this.apiUrl);
  }

  getUserById(id: number): Observable<Utilisateur> {
    return this.http.get<Utilisateur>(`${this.apiUrl}/${id}`);
  }

  getUserByKeycloakId(keycloakId: string): Observable<Utilisateur> {
    return this.http.get<Utilisateur>(`${this.apiUrl}/keycloak/${keycloakId}`);
  }

  updateUserProfile(updates: any): Observable<Utilisateur> {
    const keycloakId = this.keycloakService.getKeycloakUserId();
    if (!keycloakId) throw new Error('Utilisateur Keycloak non trouvé');
    return this.http.patch<Utilisateur>(
        `${this.apiUrl}/keycloak/${keycloakId}/profile`, updates);
  }

  updateUserProfileWithPhoto(formData: FormData): Observable<Utilisateur> {
    const keycloakId = this.keycloakService.getKeycloakUserId();
    return this.http.patch<Utilisateur>(
        `${this.apiUrl}/keycloak/${keycloakId}/profile`, formData);
  }

  toggleActif(id: number): Observable<Utilisateur> {
    return this.http.patch<Utilisateur>(`${this.apiUrl}/${id}/toggle-actif`, {});
  }

  resetPassword(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/reset-password`, {});
  }

  updateByAdmin(id: number, body: any): Observable<Utilisateur> {
    return this.http.put<Utilisateur>(`${this.apiUrl}/${id}`, body);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  syncKeycloakProfilIds(): Observable<any> {
    return this.http.post<any>(
        `${this.apiUrl}/sync-keycloak-profil-ids`, {});
  }
}