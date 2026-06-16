// src/app/services/commentaire.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Commentaire, CommentaireRequest } from '../shared/models/commentaire.model';

@Injectable({ providedIn: 'root' })
export class CommentaireService {
    private http = inject(HttpClient);
    private base = 'http://localhost:8085/api/application/commentaires';

    getByProjet(projetId: number): Observable<Commentaire[]> {
        return this.http.get<Commentaire[]>(`${this.base}/projet/${projetId}`);
    }

    getByActivite(activiteId: number): Observable<Commentaire[]> {
        return this.http.get<Commentaire[]>(`${this.base}/activite/${activiteId}`);
    }

    createForProjet(projetId: number, req: CommentaireRequest): Observable<Commentaire> {
        return this.http.post<Commentaire>(`${this.base}/projet/${projetId}`, req);
    }

    createForActivite(activiteId: number, req: CommentaireRequest): Observable<Commentaire> {
        return this.http.post<Commentaire>(`${this.base}/activite/${activiteId}`, req);
    }

    update(id: number, contenu: string): Observable<Commentaire> {
        return this.http.put<Commentaire>(`${this.base}/${id}`, { contenu });
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.base}/${id}`);
    }
}