// src/app/services/document-espace-stage.service.ts — NOUVEAU
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentEspaceStage } from '../shared/models/document-espace-stage.model';

@Injectable({ providedIn: 'root' })
export class DocumentEspaceStageService {

  private http = inject(HttpClient);
  private api  = 'http://localhost:8085/api/application/documents-espace-stage';

  /**
   * Récupère les documents visibles pour l'utilisateur courant. Le backend
   * détermine seul le niveau d'accès (vue large vs restreinte) selon les
   * permissions du token — aucun paramètre à passer ici.
   */
  getAll(): Observable<DocumentEspaceStage[]> {
    return this.http.get<DocumentEspaceStage[]>(this.api);
  }
}