import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UiService }             from '../../../services/ui.service';
import { StatutActiviteService } from '../../../services/statutactivite.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { StatutActivite }        from '../../../shared/models/statut-activite.model';

@Component({
  selector: 'app-statut-activite',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './statut-activite.component.html'
})
export class StatutActiviteComponent implements OnInit {

  private svc   = inject(StatutActiviteService);
  readonly ui   = inject(UiService);
  readonly perms = inject(PermissionContextService);
  private fb    = inject(FormBuilder);

  items       = signal<StatutActivite[]>([]);
  loading     = signal(false);
  slideOpen   = signal(false);
  editingId   = signal<number | null>(null);
  selectedIds = signal<Set<number>>(new Set());
  filterOpen  = signal(false);
  searchText  = signal('');
  filterActif = signal<boolean | null>(null);
  currentPage = signal(1);
  readonly pageSize = 10;

  form: FormGroup = this.fb.group({
    code:    ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
    libelle: ['', Validators.required],
    couleur: ['#10b981'],
    ordre:   [0],
    actif:   [true]
  });

  filtered = computed(() => {
    let list = this.items();
    const q  = this.searchText().toLowerCase();
    if (q) list = list.filter(i =>
      i.code.toLowerCase().includes(q) ||
      i.libelle.toLowerCase().includes(q));
    if (this.filterActif() !== null)
      list = list.filter(i => i.actif === this.filterActif());
    return list;
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  pagesArr   = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  paged      = computed(() => {
    const s = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(s, s + this.pageSize);
  });

  countActifs        = computed(() => this.items().filter(i => i.actif).length);
  countInactifs      = computed(() => this.items().filter(i => !i.actif).length);
  activeFiltersCount = computed(() => this.filterActif() !== null ? 1 : 0);
  allPageSelected    = computed(() =>
    this.paged().length > 0 && this.paged().every(i => this.selectedIds().has(i.id)));
  somePageSelected   = computed(() =>
    this.paged().some(i => this.selectedIds().has(i.id)) && !this.allPageSelected());

  readonly COULEURS = [
    '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
    '#ec4899','#06b6d4','#f97316','#64748b','#6366f1'
  ];

  ngOnInit(): void {
    if (!this.perms.canViewStatutActivite()) return;
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next:  d  => { this.items.set(d); this.loading.set(false); },
      error: () => { this.ui.error('Erreur chargement.'); this.loading.set(false); }
    });
  }

  openCreate(): void {
    if (!this.perms.canCreateStatutActivite()) { this.ui.warning('Permission requise.'); return; }
    this.editingId.set(null);
    this.form.reset({ code: '', libelle: '', couleur: '#10b981', ordre: 0, actif: true });
    this.form.get('code')?.enable();
    this.slideOpen.set(true);
  }

  openEdit(item: StatutActivite): void {
    if (!this.perms.canEditStatutActivite()) { this.ui.warning('Permission requise.'); return; }
    this.editingId.set(item.id);
    this.form.patchValue({
      code: item.code, libelle: item.libelle,
      couleur: item.couleur || '#10b981',
      ordre: item.ordre, actif: item.actif
    });
    this.form.get('code')?.disable();
    this.slideOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    const body = this.form.getRawValue();
    const id   = this.editingId();
    const req  = id ? this.svc.update(id, body) : this.svc.create(body);
    req.subscribe({
      next: saved => {
        this.items.update(l =>
          id ? l.map(x => x.id === saved.id ? saved : x) : [...l, saved]);
        this.slideOpen.set(false);
        this.loading.set(false);
        this.ui.success(id ? 'Mis à jour ✅' : 'Créé ✅');
      },
      error: () => { this.loading.set(false); this.ui.error('Erreur sauvegarde.'); }
    });
  }

  delete(item: StatutActivite): void {
    if (!this.perms.canDeleteStatutActivite()) { this.ui.warning('Permission requise.'); return; }
    this.ui.confirm({
      title: 'Supprimer',
      message: `Supprimer "${item.libelle}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this.svc.delete(item.id).subscribe({
        next: () => { this.items.update(l => l.filter(x => x.id !== item.id)); this.ui.success('Supprimé.'); }
      })
    });
  }

  bulkDelete(): void {
    if (!this.perms.canDeleteStatutActivite()) { this.ui.warning('Permission requise.'); return; }
    const ids = Array.from(this.selectedIds());
    this.ui.confirm({
      title: `Supprimer ${ids.length} élément(s)`,
      message: 'Cette action est irréversible.',
      confirmLabel: 'Tout supprimer', type: 'danger',
      onConfirm: () => {
        let done = 0;
        ids.forEach(id => this.svc.delete(id).subscribe({
          next: () => {
            this.items.update(l => l.filter(x => x.id !== id));
            if (++done === ids.length) { this.clearSelection(); this.ui.success('Supprimés.'); }
          }
        }));
      }
    });
  }

  toggleActif(item: StatutActivite, e: Event): void {
    e.stopPropagation();
    if (!this.perms.canEditStatutActivite()) { this.ui.warning('Permission requise.'); return; }
    const req = item.actif ? this.svc.deactivate(item.id) : this.svc.activate(item.id);
    req.subscribe({
      next: saved => this.items.update(l => l.map(x => x.id === saved.id ? saved : x))
    });
  }

  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  toggleSelect(id: number, e: Event): void {
    e.stopPropagation();
    this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  toggleSelectAll(): void {
    if (this.allPageSelected()) {
      this.selectedIds.update(s => { const n = new Set(s); this.paged().forEach(x => n.delete(x.id)); return n; });
    } else {
      this.selectedIds.update(s => { const n = new Set(s); this.paged().forEach(x => n.add(x.id)); return n; });
    }
  }
  clearSelection(): void  { this.selectedIds.set(new Set()); }
  closeSlide():    void   { this.slideOpen.set(false); }
  toggleFilter():  void   { this.filterOpen.update(v => !v); }
  resetFilters():  void   { this.searchText.set(''); this.filterActif.set(null); this.currentPage.set(1); }
  goPage(p: number): void { if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p); }
  minVal(a: number, b: number): number { return Math.min(a, b); }
}