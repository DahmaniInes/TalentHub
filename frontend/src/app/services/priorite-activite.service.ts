// src/app/services/priorite-activite.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PrioriteActivite, PrioriteActiviteRequest } from '../shared/models/priorite-activite.model';


@Injectable({ providedIn: 'root' })
export class PrioriteActiviteService {

  private http = inject(HttpClient);

  /** Base URL du nomenclature-service via gateway */
  private base = 'http://localhost:8085/api/nomenclature/priorites-activite';

  // ── Lecture ──────────────────────────────────────────────

  /**
   * Toutes les priorités (actives + inactives) — pour la page de gestion.
   * Permission requise : ACT_PRIORITY_VIEW
   */
  getAll(): Observable<PrioriteActivite[]> {
    return this.http.get<PrioriteActivite[]>(this.base);
  }

  /**
   * Priorités actives uniquement — pour les selects dans les formulaires.
   * À utiliser dans projet-detail, activite-form, etc.
   * Permission requise : ACT_PRIORITY_VIEW
   */
  getActives(): Observable<PrioriteActivite[]> {
    return this.http.get<PrioriteActivite[]>(`${this.base}/actives`);
  }

  /** Cherche une priorité par id. */
  getById(id: number): Observable<PrioriteActivite> {
    return this.http.get<PrioriteActivite>(`${this.base}/${id}`);
  }

  // ── Écriture ─────────────────────────────────────────────

  /** Crée une nouvelle priorité. Permission : ACT_PRIORITY_CREATE */
  create(req: PrioriteActiviteRequest): Observable<PrioriteActivite> {
    return this.http.post<PrioriteActivite>(this.base, req);
  }

  /** Met à jour une priorité (le code est ignoré côté serveur). Permission : ACT_PRIORITY_EDIT */
  update(id: number, req: PrioriteActiviteRequest): Observable<PrioriteActivite> {
    return this.http.put<PrioriteActivite>(`${this.base}/${id}`, req);
  }

  /** Bascule actif/inactif. Permission : ACT_PRIORITY_EDIT */
  toggle(id: number): Observable<PrioriteActivite> {
    return this.http.patch<PrioriteActivite>(`${this.base}/${id}/toggle`, {});
  }

  /** Supprime une priorité. Permission : ACT_PRIORITY_DELETE */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** Suppression en masse. Permission : ACT_PRIORITY_DELETE */
  deleteBulk(ids: number[]): Observable<void> {
    return this.http.delete<void>(`${this.base}/bulk`, { body: ids });
  }
}