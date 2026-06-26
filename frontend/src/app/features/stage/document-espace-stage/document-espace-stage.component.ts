// src/app/features/espace-stage/documents-stage/documents-stage.component.ts — NOUVEAU
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentEspaceStageService } from '../../../services/document-espace-stage.service';
import { DocumentService } from '../../../services/document.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { UiService } from '../../../services/ui.service';
import { DocumentEspaceStage, CategorieDocumentStage } from '../../../shared/models/document-espace-stage.model';

@Component({
  selector: 'app-documents-stage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-espace-stage.component.html'
})
export class DocumentsStageComponent implements OnInit {

  private svc    = inject(DocumentEspaceStageService);
  private docSvc = inject(DocumentService);
  readonly perms = inject(PermissionContextService);
  readonly ui    = inject(UiService);

  documents = signal<DocumentEspaceStage[]>([]);
  loading   = signal(false);

  search          = signal('');
  filterCategorie = signal<CategorieDocumentStage | ''>('');

  filtered = computed(() => {
    let list = this.documents();
    const q = this.search().toLowerCase();
    if (q) {
      list = list.filter(d =>
        d.nom.toLowerCase().includes(q) ||
        (d.projetNom || '').toLowerCase().includes(q) ||
        (d.activiteNom || '').toLowerCase().includes(q) ||
        (d.utilisateurNomComplet || '').toLowerCase().includes(q));
    }
    if (this.filterCategorie()) {
      list = list.filter(d => d.categorie === this.filterCategorie());
    }
    return list;
  });

  countProjet   = computed(() => this.documents().filter(d => d.categorie === 'PROJET').length);
  countActivite = computed(() => this.documents().filter(d => d.categorie === 'ACTIVITE').length);
  countGeneral  = computed(() => this.documents().filter(d => d.categorie === 'GENERAL').length);

  ngOnInit(): void {
    if (!this.perms.canSeeDocEspaceStageMenu()) return;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: d => { this.documents.set(d); this.loading.set(false); },
      error: () => { this.loading.set(false); this.ui.error('Erreur lors du chargement des documents.'); }
    });
  }

  resetFilters(): void {
    this.search.set('');
    this.filterCategorie.set('');
  }

  delete(doc: DocumentEspaceStage): void {
    if (!this.perms.canDeleteDocEspaceStage()) {
      this.ui.warning('Permission INT_DOC_DELETE requise.');
      return;
    }
    this.ui.confirm({
      title: 'Supprimer', message: `Supprimer "${doc.nom}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this.docSvc.delete(doc.id).subscribe({
        next: () => {
          this.documents.update(l => l.filter(x => x.id !== doc.id));
          this.ui.success('Document supprimé.');
        },
        error: () => this.ui.error('Erreur lors de la suppression.')
      })
    });
  }

  getCategorieLabel(cat: CategorieDocumentStage): string {
    return { PROJET: 'Projet', ACTIVITE: 'Activité', GENERAL: 'Général' }[cat];
  }

  getCategorieColor(cat: CategorieDocumentStage): string {
    return { PROJET: '#6366f1', ACTIVITE: '#8b5cf6', GENERAL: '#10b981' }[cat];
  }

  getVisibilitePourLabel(v: string): string {
    return { TOUS_STAGE: 'Tous (espace stage)', ADMIN_ONLY: 'Admins uniquement', STAGIAIRE_ID: 'Stagiaire ciblé' }[v] || v;
  }

  getAvatarColor(nom?: string): string {
    const c = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6'];
    return c[(nom || '').charCodeAt(0) % c.length];
  }

  getInitiales(nom?: string): string {
    if (!nom) return '?';
    const p = nom.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : nom.substring(0, 2).toUpperCase();
  }

  formatSize(bytes?: number): string { return this.docSvc.formatSize(bytes); }
  getDocIconColor(mime?: string): string { return this.docSvc.getIconColor(mime); }
  getDocIconLabel(mime?: string): string { return this.docSvc.getIconLabel(mime); }

  fmtDateTime(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(dt.getDate()).padStart(2, '0')} ${m[dt.getMonth()]} ${dt.getFullYear()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  }
}