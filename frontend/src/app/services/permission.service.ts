import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Permission } from '../shared/models/permission.model';
import { Profil } from '../shared/models/profil.model';

const BASE = 'http://localhost:8085/api';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private http = inject(HttpClient);

  // Permissions
  getAllPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${BASE}/permissions`);
  }
  createPermission(p: Partial<Permission>): Observable<Permission> {
    return this.http.post<Permission>(`${BASE}/permissions`, p);
  }
  updatePermission(id: number, p: Partial<Permission>): Observable<Permission> {
    return this.http.put<Permission>(`${BASE}/permissions/${id}`, p);
  }
  deletePermission(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/permissions/${id}`);
  }

  // Profils
  getAllProfils(): Observable<Profil[]> {
    return this.http.get<Profil[]>(`${BASE}/profils`);
  }
  createProfil(p: Partial<Profil>): Observable<Profil> {
    return this.http.post<Profil>(`${BASE}/profils`, p);
  }
  updateProfil(id: number, p: Partial<Profil>): Observable<Profil> {
    return this.http.put<Profil>(`${BASE}/profils/${id}`, p);
  }
  deleteProfil(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/profils/${id}`);
  }
}