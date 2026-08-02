import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SoldeConge {
  tauxMensuel: number;
  moisEcoules: number;
  acquis: number;
  report: number;
  pris: number;
  solde: number;
  annee: number;
}

const BASE = 'http://localhost:8085/api/application/conges';
const NOMENC_BASE = 'http://localhost:8085/api/nomenclature/parametres-conge';

@Injectable({ providedIn: 'root' })
export class CongeService {
  private http = inject(HttpClient);

  getSolde(utilisateurId: number): Observable<SoldeConge> {
    return this.http.get<SoldeConge>(`${BASE}/solde/${utilisateurId}`);
  }

  setReport(utilisateurId: number, annee: number, joursReport: number): Observable<void> {
    return this.http.put<void>(`${BASE}/report/${utilisateurId}`, { annee, joursReport });
  }

  getTauxActuel(): Observable<{ id: number; tauxMensuel: number }> {
    return this.http.get<{ id: number; tauxMensuel: number }>(`${NOMENC_BASE}/actuel`);
  }

  updateTaux(tauxMensuel: number): Observable<{ id: number; tauxMensuel: number }> {
    return this.http.put<{ id: number; tauxMensuel: number }>(NOMENC_BASE, { tauxMensuel });
  }
}