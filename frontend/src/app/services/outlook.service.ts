// src/app/services/outlook.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE = 'http://localhost:8085/api/application/outlook';

@Injectable({ providedIn: 'root' })
export class OutlookService {
  private http = inject(HttpClient);

  connect(utilisateurId: number): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${BASE}/connect/${utilisateurId}`);
  }

  status(utilisateurId: number): Observable<{ connected: boolean }> {
    return this.http.get<{ connected: boolean }>(`${BASE}/status/${utilisateurId}`);
  }

  disconnect(utilisateurId: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/disconnect/${utilisateurId}`);
  }
}