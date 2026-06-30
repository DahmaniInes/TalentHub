// src/app/services/feuille-temps.service.ts — COMPLET FINAL
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FeuilleTemps, FeuilleTempsRequest } from '../shared/models/feuille-temps.model';

const BASE = 'http://localhost:8085/api/application/feuilles-temps';

// ✅ NOUVEAU — forme renvoyée par /activites-recentes-disponibles/{id}
export interface ActiviteRecenteDTO {
  projetId?: number;
  activiteId?: number;
  clientId?: number;
  heureDebut?: string;
  heureFin?: string;
  minutesTravaillees: number;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class FeuilleTempsService {
  private http = inject(HttpClient);

  getAll(): Observable<FeuilleTemps[]>                    { return this.http.get<FeuilleTemps[]>(BASE); }
  getById(id: number): Observable<FeuilleTemps>           { return this.http.get<FeuilleTemps>(`${BASE}/${id}`); }
  getByUtilisateur(id: number): Observable<FeuilleTemps[]> { return this.http.get<FeuilleTemps[]>(`${BASE}/utilisateur/${id}`); }
  getSoumises(): Observable<FeuilleTemps[]>               { return this.http.get<FeuilleTemps[]>(`${BASE}/approbations`); }

  create(req: FeuilleTempsRequest): Observable<FeuilleTemps>           { return this.http.post<FeuilleTemps>(BASE, req); }
  update(id: number, req: FeuilleTempsRequest): Observable<FeuilleTemps> { return this.http.put<FeuilleTemps>(`${BASE}/${id}`, req); }
  soumettre(id: number): Observable<FeuilleTemps>         { return this.http.post<FeuilleTemps>(`${BASE}/${id}/soumettre`, {}); }
  annulerSoumission(id: number): Observable<FeuilleTemps> { return this.http.post<FeuilleTemps>(`${BASE}/${id}/annuler-soumission`, {}); }
  valider(id: number, valideurId: string, commentaire: string): Observable<FeuilleTemps> {
    return this.http.post<FeuilleTemps>(`${BASE}/${id}/valider`, { valideurId, commentaire });
  }
  rejeter(id: number, valideurId: string, commentaire: string): Observable<FeuilleTemps> {
    return this.http.post<FeuilleTemps>(`${BASE}/${id}/rejeter`, { valideurId, commentaire });
  }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${BASE}/${id}`); }

  notifierModification(
    destinataireKeycloakId: string,
    nomModificateur: string,
    semaineDu: string
  ): Observable<void> {
    return this.http.post<void>(`${BASE}/notifier-modification`, {
      destinataireKeycloakId,
      nomModificateur,
      semaineDu
    });
  }

  /**
   * ✅ NOUVEAU — Demande D : activités récentes à proposer dans le bloc
   * "Reprendre une activité" du calendrier, calculées et FILTRÉES
   * côté serveur (exclut les projets dont l'utilisateur n'a plus accès via
   * aucun groupe, sans jamais supprimer de ligne de feuille de temps).
   */
  getActivitesRecentesDisponibles(utilisateurId: number): Observable<ActiviteRecenteDTO[]> {
    return this.http.get<ActiviteRecenteDTO[]>(`${BASE}/activites-recentes-disponibles/${utilisateurId}`);
  }

  // ── Utilitaires statiques ──
  static formatMinutes(min: number): string {
    if (!min || min <= 0) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${h}:00`;
  }

  static getDatesDesSemaine(lundi: string): string[] {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(lundi);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }

  static getLundiSemaine(date = new Date()): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  static getSamediSemaine(lundi: string): string {
    const d = new Date(lundi);
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  }

  static getVendrediSemaine(lundi: string): string {
    const d = new Date(lundi);
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  }

  static isWeekend(dateStr: string): boolean {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6;
  }

  static formatColJour(dateStr: string): string {
    const d = new Date(dateStr);
    const noms = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return `${noms[d.getDay()]}${d.getDate()}`;
  }

  static formatHeureAMPM(heure: string): string {
    if (!heure) return '—';
    const [hStr, mStr] = heure.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  }

  static getDureeFmt(debut: string, fin: string): string {
    if (!debut || !fin) return '—';
    const mins = FeuilleTempsService.minutesFromHHMM(debut, fin);
    return FeuilleTempsService.formatMinutes(mins);
  }

  static minutesFromHHMM(debut: string, fin: string): number {
    if (!debut || !fin) return 0;
    const [h1, m1] = debut.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  }
}