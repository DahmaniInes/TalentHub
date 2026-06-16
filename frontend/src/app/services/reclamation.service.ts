// src/app/services/reclamation.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Reclamation, ReclamationRequest, ServiceReclamation, StatutReclamation } from '../shared/models/reclamation.model';

const BASE      = 'http://localhost:8085/api/application/reclamations';
const NOMEN_URL = 'http://localhost:8085/api/nomenclature'; // via gateway

@Injectable({ providedIn: 'root' })
export class ReclamationService {
  private http = inject(HttpClient);

  // ── Réclamations ──
  getAll(): Observable<Reclamation[]>                    { return this.http.get<Reclamation[]>(BASE); }
  getById(id: number): Observable<Reclamation>           { return this.http.get<Reclamation>(`${BASE}/${id}`); }
  getByUtilisateur(id: number): Observable<Reclamation[]>{ return this.http.get<Reclamation[]>(`${BASE}/utilisateur/${id}`); }
  create(req: ReclamationRequest): Observable<Reclamation>{ return this.http.post<Reclamation>(BASE, req); }
  update(id: number, req: ReclamationRequest): Observable<Reclamation>{ return this.http.put<Reclamation>(`${BASE}/${id}`, req); }
  delete(id: number): Observable<void>                   { return this.http.delete<void>(`${BASE}/${id}`); }

  traiter(id: number, statutId: number, commentaire: string, statutCode: string): Observable<Reclamation> {
    return this.http.post<Reclamation>(`${BASE}/${id}/traiter`, { statutId: String(statutId), commentaire, statutCode });
  }

  ajouterCommentaire(id: number, contenu: string, auteurNom: string, estAdmin: boolean): Observable<Reclamation> {
    return this.http.post<Reclamation>(`${BASE}/${id}/commentaires`, { contenu, auteurNom, estAdmin });
  }

  /** Upload un fichier sur Cloudinary via le backend */
  uploadDocument(file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(`${BASE}/upload`, fd);
  }

  // ── Nomenclature : services de réclamation ──
  getAllServices(): Observable<ServiceReclamation[]> {
    return this.http.get<ServiceReclamation[]>(`${NOMEN_URL}/services-reclamation`);
  }
  createService(req: any): Observable<ServiceReclamation> {
    return this.http.post<ServiceReclamation>(`${NOMEN_URL}/services-reclamation`, req);
  }
  updateService(id: number, req: any): Observable<ServiceReclamation> {
    return this.http.put<ServiceReclamation>(`${NOMEN_URL}/services-reclamation/${id}`, req);
  }
  deleteService(id: number): Observable<void> {
    return this.http.delete<void>(`${NOMEN_URL}/services-reclamation/${id}`);
  }
  activateService(id: number): Observable<ServiceReclamation> {
    return this.http.patch<ServiceReclamation>(`${NOMEN_URL}/services-reclamation/${id}/activate`, {});
  }
  deactivateService(id: number): Observable<ServiceReclamation> {
    return this.http.patch<ServiceReclamation>(`${NOMEN_URL}/services-reclamation/${id}/deactivate`, {});
  }

  // ── Nomenclature : statuts de réclamation ──
  getAllStatuts(): Observable<StatutReclamation[]> {
    return this.http.get<StatutReclamation[]>(`${NOMEN_URL}/statuts-reclamation`);
  }
  createStatut(req: any): Observable<StatutReclamation> {
    return this.http.post<StatutReclamation>(`${NOMEN_URL}/statuts-reclamation`, req);
  }
  updateStatut(id: number, req: any): Observable<StatutReclamation> {
    return this.http.put<StatutReclamation>(`${NOMEN_URL}/statuts-reclamation/${id}`, req);
  }
  deleteStatut(id: number): Observable<void> {
    return this.http.delete<void>(`${NOMEN_URL}/statuts-reclamation/${id}`);
  }
  activateStatut(id: number): Observable<StatutReclamation> {
    return this.http.patch<StatutReclamation>(`${NOMEN_URL}/statuts-reclamation/${id}/activate`, {});
  }
  deactivateStatut(id: number): Observable<StatutReclamation> {
    return this.http.patch<StatutReclamation>(`${NOMEN_URL}/statuts-reclamation/${id}/deactivate`, {});
  }
}