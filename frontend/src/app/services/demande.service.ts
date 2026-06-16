// src/app/services/demande.service.ts — REMPLACE
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Demande, DemandeRequest } from '../shared/models/demande.model';

const BASE = 'http://localhost:8085/api/application/demandes';

@Injectable({ providedIn: 'root' })
export class DemandeService {
    private http = inject(HttpClient);

    getAll(): Observable<Demande[]> {
        return this.http.get<Demande[]>(BASE);
    }
    getByUtilisateur(id: number): Observable<Demande[]> {
        return this.http.get<Demande[]>(`${BASE}/utilisateur/${id}`);
    }
    create(req: DemandeRequest): Observable<Demande> {
        return this.http.post<Demande>(BASE, req);
    }
    update(id: number, req: DemandeRequest): Observable<Demande> {
        return this.http.put<Demande>(`${BASE}/${id}`, req);
    }


  // demande.service.ts — REMPLACE traiter()
traiter(id: number, statutId: number, traitePar: string,
  commentaireRH: string, statutCode: string): Observable<Demande> {
return this.http.post<Demande>(`${BASE}/${id}/traiter`,
  { statutId, traitePar, commentaireRH, statutCode });
}



    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${BASE}/${id}`);
    }

    // ✅ Export CSV
    exportCsv(): void {
        window.open(`${BASE}/export/csv`, '_blank');
    }
}