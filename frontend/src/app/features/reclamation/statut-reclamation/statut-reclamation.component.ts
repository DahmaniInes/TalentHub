// src/app/features/reclamation/pages/statut-reclamation/statut-reclamation.component.ts
// Pattern identique à types-demandes — adapté pour StatutReclamation + permissions RECLAMATION_STATUT_*
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReclamationService }       from '../../../services/reclamation.service';
import { UiService }                from '../../../services/ui.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { StatutReclamation }        from '../../../shared/models/reclamation.model';
import { HttpErrorResponse }        from '@angular/common/http';

@Component({
  selector: 'app-statut-reclamation',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './statut-reclamation.component.html',
  styleUrls: ['./statut-reclamation.component.css']
})
export class StatutReclamationComponent implements OnInit {

  private recSvc   = inject(ReclamationService);
  private fb       = inject(FormBuilder);
  private ui       = inject(UiService);
  readonly perms   = inject(PermissionContextService);

  statuts     = signal<StatutReclamation[]>([]);
  loading     = signal(false);
  filterOpen  = signal(false);
  searchText  = signal('');
  filterActif = signal<boolean | null>(null);
  selectedIds = signal<Set<number>>(new Set());
  slideOpen   = signal(false);
  editingId   = signal<number | null>(null);
  pageSize    = 10;
  currentPage = signal(1);

  form: FormGroup;

  // Codes réservés — non modifiables par l'utilisateur (logique métier figée)
  readonly CODES_FIXES = ['EN_ATTENTE', 'EN_COURS', 'RESOLUE', 'REJETEE', 'FERMEE'];

  constructor() {
    this.form = this.fb.group({
      code:        ['', Validators.required],
      libelle:     ['', Validators.required],
      description: [''],
      actif:       [true]
    });
  }

  ngOnInit(): void {
    if (!this.perms.canReadStatutRec()) {
      this.ui.warning('Accès refusé : permission RECLAMATION_STATUT_READ requise.');
      return;
    }
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.recSvc.getAllStatuts().subscribe({
      next: d => { this.statuts.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  countActifs   = computed(() => this.statuts().filter(s =>  s.actif).length);
  countInactifs = computed(() => this.statuts().filter(s => !s.actif).length);

  filtered = computed(() => {
    let list = this.statuts();
    const q = this.searchText().toLowerCase();
    if (q) list = list.filter(s => s.code.toLowerCase().includes(q) || s.libelle.toLowerCase().includes(q));
    const a = this.filterActif();
    if (a !== null) list = list.filter(s => s.actif === a);
    return list;
  });

  paged      = computed(() => this.filtered().slice((this.currentPage()-1)*this.pageSize, this.currentPage()*this.pageSize));
  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i+1));
  activeFiltersCount = computed(() => this.filterActif() !== null ? 1 : 0);

  allPageSelected = computed(() => {
    const p = this.paged();
    return p.length > 0 && p.every(s => this.selectedIds().has(s.id));
  });
  somePageSelected = computed(() => {
    const p = this.paged();
    return p.some(s => this.selectedIds().has(s.id)) && !this.allPageSelected();
  });

  toggleSelectAll(): void {
    const p = this.paged();
    const s = new Set(this.selectedIds());
    this.allPageSelected() ? p.forEach(x => s.delete(x.id)) : p.forEach(x => s.add(x.id));
    this.selectedIds.set(s);
  }
  toggleSelect(id: number, e: Event): void {
    e.stopPropagation();
    const s = new Set(this.selectedIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedIds.set(s);
  }
  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  clearSelection(): void { this.selectedIds.set(new Set()); }

  bulkDelete(): void {
    if (!this.perms.canDeleteStatutRec()) { this.ui.error('Permission RECLAMATION_STATUT_DELETE requise.'); return; }
    const ids = Array.from(this.selectedIds());
    this.ui.confirm({
      title: 'Supprimer les statuts', message: `Supprimer ${ids.length} statut(s) ?`,
      type: 'danger', confirmLabel: 'Supprimer',
      onConfirm: () => {
        Promise.all(ids.map(id => this.recSvc.deleteStatut(id).toPromise()))
          .then(() => { this.ui.success(`${ids.length} statut(s) supprimé(s).`); this.clearSelection(); this.loadAll(); })
          .catch(() => this.ui.error('Erreur.'));
      }
    });
  }

  toggleFilter(): void { this.filterOpen.update(v => !v); }
  resetFilters(): void { this.filterActif.set(null); this.searchText.set(''); this.currentPage.set(1); }

  openCreate(): void {
    if (!this.perms.canCreateStatutRec()) { this.ui.error('Permission RECLAMATION_STATUT_CREATE requise.'); return; }
    this.editingId.set(null);
    this.form.reset({ actif: true });
    this.form.get('code')!.enable();
    this.slideOpen.set(true);
  }

  openEdit(s: StatutReclamation): void {
    if (!this.perms.canUpdateStatutRec()) { this.ui.error('Permission RECLAMATION_STATUT_UPDATE requise.'); return; }
    this.editingId.set(s.id);
    this.form.patchValue(s);
    this.form.get('code')!.disable(); // code non modifiable
    this.slideOpen.set(true);
  }

  closeSlide(): void { this.slideOpen.set(false); }

  save(): void {
    if (this.form.invalid) { this.ui.error('Champs obligatoires manquants.'); return; }
    this.loading.set(true);
    const id  = this.editingId();
    const val = { ...this.form.getRawValue() };
    const obs = id ? this.recSvc.updateStatut(id, val) : this.recSvc.createStatut(val);
    obs.subscribe({
      next: () => { this.slideOpen.set(false); this.ui.success(id ? 'Statut modifié.' : 'Statut créé.'); this.loadAll(); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.ui.error(err.error?.message || 'Erreur.'); this.loading.set(false); }
    });
  }

  toggleActif(s: StatutReclamation, e: Event): void {
    e.stopPropagation();
    if (s.actif && !this.perms.canDeactivateStatutRec()) { this.ui.error('Permission RECLAMATION_STATUT_DEACTIVATE requise.'); return; }
    if (!s.actif && !this.perms.canActivateStatutRec())  { this.ui.error('Permission RECLAMATION_STATUT_ACTIVATE requise.'); return; }
    const obs = s.actif ? this.recSvc.deactivateStatut(s.id) : this.recSvc.activateStatut(s.id);
    obs.subscribe({
      next: () => { this.ui.success(s.actif ? 'Désactivé.' : 'Activé.'); this.loadAll(); },
      error: () => this.ui.error('Erreur.')
    });
  }

  delete(s: StatutReclamation): void {
    if (!this.perms.canDeleteStatutRec()) { this.ui.error('Permission RECLAMATION_STATUT_DELETE requise.'); return; }
    this.ui.confirm({
      title: 'Supprimer le statut', message: `Supprimer "${s.libelle}" ?`,
      type: 'danger', confirmLabel: 'Supprimer',
      onConfirm: () => {
        this.recSvc.deleteStatut(s.id).subscribe({
          next: () => { this.ui.success('Supprimé.'); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(err.error?.message || 'Erreur.')
        });
      }
    });
  }

  getCodeColor(code: string): string {
    const map: Record<string, string> = {
      EN_ATTENTE: '#f59e0b', EN_COURS: '#3b82f6',
      RESOLUE: '#10b981', REJETEE: '#ef4444', FERMEE: '#64748b'
    };
    return map[code] || 'var(--accent)';
  }

  goPage(p: number): void { this.currentPage.set(Math.max(1, Math.min(p, this.totalPages()))); }
  minVal(a: number, b: number): number { return Math.min(a, b); }
}