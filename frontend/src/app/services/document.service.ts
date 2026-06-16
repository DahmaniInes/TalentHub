import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Document, TypeDocument, StatutDocument } from '../shared/models/document.model';

const BASE       = 'http://localhost:8085/api/application/documents';
const NOMEN_BASE = 'http://localhost:8085/api/nomenclature';

@Injectable({ providedIn: 'root' })
export class DocumentService {

  private http = inject(HttpClient);

  // ── Lecture ──

  getByProjet(projetId: number): Observable<Document[]> {
    return this.http.get<Document[]>(`${BASE}/projet/${projetId}`);
  }

  getByActivite(activiteId: number): Observable<Document[]> {
    return this.http.get<Document[]>(`${BASE}/activite/${activiteId}`);
  }

  getById(id: number): Observable<Document> {
    return this.http.get<Document>(`${BASE}/${id}`);
  }

  // ── Upload ──
  // Envoie un multipart/form-data avec le fichier + metadata
  upload(params: {
    file: File;
    projetId?: number;
    activiteId?: number;
    stageId?: number;
    typeDocumentId?: number;
    description?: string;
    confidentiel?: boolean;
  }): Observable<Document> {
    const formData = new FormData();
    formData.append('file', params.file);
    if (params.projetId)       formData.append('projetId',       String(params.projetId));
    if (params.activiteId)     formData.append('activiteId',     String(params.activiteId));
    if (params.stageId)        formData.append('stageId',        String(params.stageId));
    if (params.typeDocumentId) formData.append('typeDocumentId', String(params.typeDocumentId));
    if (params.description)    formData.append('description',    params.description);
    formData.append('confidentiel', String(params.confidentiel ?? false));
    return this.http.post<Document>(BASE, formData);
  }

  // ── Soft delete (archive) ──
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${BASE}/${id}`);
  }

  // ── Nomenclature ──
  getTypesDocument(): Observable<TypeDocument[]> {
    return this.http.get<TypeDocument[]>(`${NOMEN_BASE}/type-document/actifs`);
  }

  getStatutsDocument(): Observable<StatutDocument[]> {
    return this.http.get<StatutDocument[]>(`${NOMEN_BASE}/statut-document/actifs`);
  }

  // ── Formatage taille ──
  formatSize(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  // ── Icône selon MIME ──
  getIconColor(typeMime?: string): string {
    if (!typeMime) return '#94a3b8';
    if (typeMime.includes('pdf'))   return '#ef4444';
    if (typeMime.includes('word') || typeMime.includes('doc')) return '#3b82f6';
    if (typeMime.includes('sheet') || typeMime.includes('xls')) return '#10b981';
    if (typeMime.includes('presentation') || typeMime.includes('ppt')) return '#f97316';
    if (typeMime.includes('image')) return '#8b5cf6';
    if (typeMime.includes('zip') || typeMime.includes('rar')) return '#f59e0b';
    return '#64748b';
  }

  getIconLabel(typeMime?: string): string {
    if (!typeMime) return 'FILE';
    if (typeMime.includes('pdf'))   return 'PDF';
    if (typeMime.includes('word') || typeMime.includes('doc')) return 'DOC';
    if (typeMime.includes('sheet') || typeMime.includes('xls')) return 'XLS';
    if (typeMime.includes('presentation') || typeMime.includes('ppt')) return 'PPT';
    if (typeMime.includes('image')) return 'IMG';
    if (typeMime.includes('zip') || typeMime.includes('rar')) return 'ZIP';
    return 'FILE';
  }
}