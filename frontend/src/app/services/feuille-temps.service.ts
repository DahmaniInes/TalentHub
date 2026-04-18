// src/app/services/feuille-temps.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FeuilleTemps, FeuilleTempsRequest } from '../shared/models/feuille-temps.model';

const BASE = 'http://localhost:8085/api/feuilles-temps';

@Injectable({ providedIn: 'root' })
export class FeuilleTempsService {
  private http = inject(HttpClient);

  getAll(): Observable<FeuilleTemps[]>                  { return this.http.get<FeuilleTemps[]>(BASE); }
  getById(id: number): Observable<FeuilleTemps>          { return this.http.get<FeuilleTemps>(`${BASE}/${id}`); }
  getByUtilisateur(id: number): Observable<FeuilleTemps[]> { return this.http.get<FeuilleTemps[]>(`${BASE}/utilisateur/${id}`); }
  getSoumises(): Observable<FeuilleTemps[]>              { return this.http.get<FeuilleTemps[]>(`${BASE}/approbations`); }

  create(req: FeuilleTempsRequest): Observable<FeuilleTemps>          { return this.http.post<FeuilleTemps>(BASE, req); }
  update(id: number, req: FeuilleTempsRequest): Observable<FeuilleTemps> { return this.http.put<FeuilleTemps>(`${BASE}/${id}`, req); }
  soumettre(id: number): Observable<FeuilleTemps>       { return this.http.post<FeuilleTemps>(`${BASE}/${id}/soumettre`, {}); }
  annulerSoumission(id: number): Observable<FeuilleTemps> { return this.http.post<FeuilleTemps>(`${BASE}/${id}/annuler-soumission`, {}); }
  valider(id: number, valideurId: string, commentaire: string): Observable<FeuilleTemps> {
    return this.http.post<FeuilleTemps>(`${BASE}/${id}/valider`, { valideurId, commentaire });
  }
  rejeter(id: number, valideurId: string, commentaire: string): Observable<FeuilleTemps> {
    return this.http.post<FeuilleTemps>(`${BASE}/${id}/rejeter`, { valideurId, commentaire });
  }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${BASE}/${id}`); }

  // ── Utilitaires statiques ──
  static formatMinutes(min: number): string {
    if (!min || min <= 0) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${h}:00`;
  }

  static formatHeureAMPM(hhmm: string): string {
    if (!hhmm) return '—';
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }

  static getDureeFmt(debut: string, fin: string): string {
    if (!debut || !fin) return '—';
    const [dh, dm] = debut.split(':').map(Number);
    const [fh, fm] = fin.split(':').map(Number);
    const totalMin = (fh * 60 + fm) - (dh * 60 + dm);
    if (totalMin <= 0) return '—';
    return FeuilleTempsService.formatMinutes(totalMin);
  }

  // Lundi de la semaine courante
  static getLundiSemaine(date = new Date()): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  // Samedi (fin de semaine — on inclut samedi dans la matrice)
  static getSamediSemaine(lundi: string): string {
    const d = new Date(lundi);
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  }

  // Vendredi (pour compatibilité backend)
  static getVendrediSemaine(lundi: string): string {
    const d = new Date(lundi);
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  }

  // Génère les 6 dates de la semaine (lundi → samedi)
  static getDatesDesSemaine(lundi: string): string[] {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(lundi);
      d.setDate(d.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }

  // Nom court du jour + numéro : "Lun 13"
  static formatColJour(dateStr: string): string {
    const d = new Date(dateStr);
    const noms = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return `${noms[d.getDay()]}${d.getDate()}`;
  }

  static isWeekend(dateStr: string): boolean {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6; // dimanche ou samedi
  }

  static minutesFromHHMM(debut: string, fin: string): number {
    if (!debut || !fin) return 0;
    const [dh, dm] = debut.split(':').map(Number);
    const [fh, fm] = fin.split(':').map(Number);
    const total = (fh * 60 + fm) - (dh * 60 + dm);
    return Math.max(0, total);
  }

  static addMinutesToHHMM(hhmm: string, minutes: number): string {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const totalMin = h * 60 + m + minutes;
    const hh = Math.floor(totalMin / 60) % 24;
    const mm = totalMin % 60;
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }
}