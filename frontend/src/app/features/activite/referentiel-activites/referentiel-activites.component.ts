import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StatutActiviteService }    from '../../../services/statutactivite.service';
import { PrioriteActiviteService }  from '../../../services/priorite-activite.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { UiService }                from '../../../services/ui.service';
import { StatutActivite }           from '../../../shared/models/statut-activite.model';
import { PrioriteActivite }         from '../../../shared/models/priorite-activite.model';

type TabType = 'statuts' | 'priorites';

@Component({
  selector: 'app-referentiel-activites',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './referentiel-activites.component.html'
})
export class ReferentielActivitesComponent implements OnInit {

  private statutSvc   = inject(StatutActiviteService);
  private prioriteSvc = inject(PrioriteActiviteService);
  readonly perms      = inject(PermissionContextService);
  readonly ui         = inject(UiService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);
  private fb          = inject(FormBuilder);

  tab         = signal<TabType>('statuts');
  statuts     = signal<StatutActivite[]>([]);
  priorites   = signal<PrioriteActivite[]>([]);
  loading     = signal(false);
  saving      = signal(false);
  slideOpen   = signal(false);
  editingId   = signal<number | null>(null);
  selectedIds = signal<Set<number>>(new Set());
  search      = signal('');
  filterActif = signal<boolean | null>(null);
  filterOpen  = signal(false);
  currentPage = signal(1);
  readonly pageSize = 15;

  readonly COULEURS_STATUT = [
    '#10b981','#3b82f6','#f59e0b','#ef4444',
    '#8b5cf6','#ec4899','#06b6d4','#f97316','#64748b','#6366f1'
  ];
  readonly COULEURS_PRIORITE = [
    '#10b981','#3b82f6','#f97316','#ef4444',
    '#8b5cf6','#ec4899','#06b6d4','#eab308',
    '#64748b','#c026d3','#0d41f6','#00c2ff'
  ];

  form: FormGroup = this.fb.group({
    code:        ['', [Validators.required, Validators.pattern('^[A-Z0-9_]+$')]],
    libelle:     ['', Validators.required],
    description: [''],
    couleur:     ['#10b981'],
    ordre:       [0],
    actif:       [true]
  });

  // ── Computed ──

  currentList = computed(() => {
    const q    = this.search().toLowerCase();
    const list = this.tab() === 'statuts' ? this.statuts() : this.priorites();
    let filtered = list.filter(i =>
      !q || i.libelle?.toLowerCase().includes(q) || i.code?.toLowerCase().includes(q));
    if (this.filterActif() !== null)
      filtered = filtered.filter(i => i.actif === this.filterActif());
    return filtered;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.currentList().length / this.pageSize)));
  pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedList  = computed(() => {
    const s = (this.currentPage() - 1) * this.pageSize;
    return this.currentList().slice(s, s + this.pageSize);
  });

  countActifs   = computed(() => this.currentList().filter(i => i.actif).length);
  countInactifs = computed(() => this.currentList().filter(i => !i.actif).length);

  allPageSelected  = computed(() =>
    this.pagedList().length > 0 && this.pagedList().every(i => this.selectedIds().has(i.id)));
  somePageSelected = computed(() =>
    this.pagedList().some(i => this.selectedIds().has(i.id)) && !this.allPageSelected());

  activeFiltersCount = computed(() => this.filterActif() !== null ? 1 : 0);

  tabLabel = computed(() =>
    this.tab() === 'statuts' ? 'Statuts d\'activité' : 'Priorités d\'activité');

  couleurs = computed(() =>
    this.tab() === 'statuts' ? this.COULEURS_STATUT : this.COULEURS_PRIORITE);

  // ── Permissions ──
  canViewStatuts()    { return this.perms.canViewStatutActivite(); }
  canCreateStatuts()  { return this.perms.canCreateStatutActivite(); }
  canEditStatuts()    { return this.perms.canEditStatutActivite(); }
  canDeleteStatuts()  { return this.perms.canDeleteStatutActivite(); }
  canViewPriorites()  { return this.perms.can('ACT_PRIORITY_VIEW'); }
  canCreatePriorites(){ return this.perms.can('ACT_PRIORITY_CREATE'); }
  canEditPriorites()  { return this.perms.can('ACT_PRIORITY_EDIT'); }
  canDeletePriorites(){ return this.perms.can('ACT_PRIORITY_DELETE'); }

  canViewCurrent()   { return this.tab() === 'statuts' ? this.canViewStatuts()   : this.canViewPriorites(); }
  canCreateCurrent() { return this.tab() === 'statuts' ? this.canCreateStatuts() : this.canCreatePriorites(); }
  canEditCurrent()   { return this.tab() === 'statuts' ? this.canEditStatuts()   : this.canEditPriorites(); }
  canDeleteCurrent() { return this.tab() === 'statuts' ? this.canDeleteStatuts() : this.canDeletePriorites(); }

  // ── Lifecycle ──

  ngOnInit(): void {
    // Lire l'onglet depuis l'URL
    this.route.paramMap.subscribe(params => {
      const tabParam = params.get('tab') as TabType;
      if (tabParam === 'statuts' || tabParam === 'priorites') {
        this.tab.set(tabParam);
      } else {
        // Onglet par défaut selon les permissions
        if (this.canViewStatuts()) {
          this.tab.set('statuts');
        } else if (this.canViewPriorites()) {
          this.tab.set('priorites');
        }
      }
    });
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    if (this.canViewStatuts() || this.canCreateStatuts()) {
      this.statutSvc.getAll().subscribe({ next: d => this.statuts.set(d) });
    }
    if (this.canViewPriorites() || this.canCreatePriorites()) {
      this.prioriteSvc.getAll().subscribe({
        next: d => { this.priorites.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    } else {
      this.loading.set(false);
    }
  }

  switchTab(t: TabType): void {
    this.tab.set(t);
    this.search.set('');
    this.filterActif.set(null);
    this.currentPage.set(1);
    this.selectedIds.set(new Set());
    // ✅ Changer l'URL sans recharger le composant
    this.router.navigate(['/referentiel-activites', t], { replaceUrl: false });
  }

  // ── Sélection ──

  isSelected(id: number): boolean { return this.selectedIds().has(id); }

  toggleSelect(id: number): void {
    this.selectedIds.update(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  toggleSelectAll(): void {
    if (this.allPageSelected()) {
      this.selectedIds.update(s => {
        const n = new Set(s);
        this.pagedList().forEach(i => n.delete(i.id));
        return n;
      });
    } else {
      this.selectedIds.update(s => {
        const n = new Set(s);
        this.pagedList().forEach(i => n.add(i.id));
        return n;
      });
    }
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  bulkDelete(): void {
    const ids = Array.from(this.selectedIds());
    this.ui.confirm({
      title: 'Supprimer la sélection',
      message: `Supprimer ${ids.length} élément(s) ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        ids.forEach(id => this._deleteById(id));
        this.clearSelection();
      }
    });
  }

  // ── CRUD ──

  openCreate(): void {
    if (!this.canCreateCurrent()) { this.ui.warning('Permission requise.'); return; }
    this.editingId.set(null);
    this.form.reset({ code: '', libelle: '', description: '', couleur: '#10b981', ordre: 0, actif: true });
    this.form.get('code')!.enable();
    this.slideOpen.set(true);
  }

  openEdit(item: any): void {
    if (!this.canEditCurrent()) { this.ui.warning('Permission requise.'); return; }
    this.editingId.set(item.id);
    this.form.patchValue({
      code: item.code, libelle: item.libelle,
      description: item.description || '',
      couleur: item.couleur || '#10b981',
      ordre: item.ordre ?? 0,
      actif: item.actif
    });
    this.slideOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = { ...raw, code: raw.code?.toUpperCase() };
    const id   = this.editingId();
    const t    = this.tab();

    let obs;
    if (t === 'statuts') {
      obs = id ? this.statutSvc.update(id, body) : this.statutSvc.create(body);
    } else {
      obs = id ? this.prioriteSvc.update(id, body) : this.prioriteSvc.create(body);
    }

    obs.subscribe({
      next: saved => {
        if (t === 'statuts') {
          this.statuts.update(l => id ? l.map(x => x.id === saved.id ? saved : x) : [...l, saved]);
        } else {
          this.priorites.update(l => id
            ? l.map(x => x.id === saved.id ? saved : x)
            : [...l, saved].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)));
        }
        this.slideOpen.set(false);
        this.saving.set(false);
        this.ui.success(id ? 'Mis à jour ✅' : 'Créé ✅');
      },
      error: (e) => {
        this.saving.set(false);
        this.ui.error(e?.error?.message || 'Erreur sauvegarde.');
      }
    });
  }

  toggleActif(item: any): void {
    if (!this.canEditCurrent()) return;
    const t = this.tab();
    let obs;
    if (t === 'statuts') {
      obs = item.actif ? this.statutSvc.deactivate(item.id) : this.statutSvc.activate(item.id);
    } else {
      obs = this.prioriteSvc.toggle(item.id);
    }
    obs.subscribe({
      next: saved => {
        if (t === 'statuts') this.statuts.update(l => l.map(x => x.id === saved.id ? saved : x));
        else this.priorites.update(l => l.map(x => x.id === saved.id ? saved : x));
      }
    });
  }

  delete(item: any): void {
    if (!this.canDeleteCurrent()) { this.ui.warning('Permission requise.'); return; }
    this.ui.confirm({
      title: 'Supprimer', message: `Supprimer "${item.libelle}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this._deleteById(item.id)
    });
  }

  private _deleteById(id: number): void {
    const t   = this.tab();
    const obs = t === 'statuts' ? this.statutSvc.delete(id) : this.prioriteSvc.delete(id);
    obs.subscribe({
      next: () => {
        if (t === 'statuts') this.statuts.update(l => l.filter(x => x.id !== id));
        else this.priorites.update(l => l.filter(x => x.id !== id));
        this.ui.success('Supprimé.');
      }
    });
  }

  // ── Helpers ──
  setCouleur(c: string): void { this.form.get('couleur')!.setValue(c); }
  toggleFilter(): void { this.filterOpen.set(!this.filterOpen()); }
  resetFilters(): void { this.filterActif.set(null); this.currentPage.set(1); }
  goPage(p: number): void { if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p); }
  minVal(a: number, b: number): number { return Math.min(a, b); }
}