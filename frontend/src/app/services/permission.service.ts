import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Permission } from '../shared/models/permission.model';
import { Profil } from '../shared/models/profil.model';

const BASE = 'http://localhost:8085/api';

// ✅ Interface pour les permissions d'un profil
export interface ProfilPermission {
  id: number;
  profilId: number;
  permissionId: number;
  permissionModule: string;
  permissionLibelle: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canExport: boolean;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private http = inject(HttpClient);

  // ── Permissions ──
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

  // ── Profils ──
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

  // ✅ Permissions d'un profil (pour vérifier les accès)
  getByProfil(profilId: number): Observable<ProfilPermission[]> {
    return this.http.get<ProfilPermission[]>(`${BASE}/profil-permissions/profil/${profilId}`);
  }

  // ✅ Vérifier si un profil a une permission spécifique
  hasPermission(
    profilId: number,
    module: string,
    libelle: string
  ): Observable<boolean> {
    return this.getByProfil(profilId).pipe(
      map(perms => perms.some(p =>
        p.permissionModule === module &&
        p.permissionLibelle === libelle &&
        p.canWrite === true
      )),
      catchError(() => of(false))
    );
  }
}