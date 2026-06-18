import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StagiaireService }         from '../../../services/stagiaire.service';
import { StatutStageService }       from '../../../services/statut-stage.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { UiService }                from '../../../services/ui.service';
import { StatutStage }              from '../../../shared/models/nomenclature-academique.model';

type TabType = 'types' | 'statuts';

@Component({
  selector: 'app-referentiel-stage',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './referentiel-stage.component.html'
})
export class ReferentielStageComponent implements OnInit {

  private typeSvc   = inject(StagiaireService);
  private statutSvc = inject(StatutStageService);
  readonly perms    = inject(PermissionContextService);
  readonly ui       = inject(UiService);
  private router    = inject(Router);
  private route     = inject(ActivatedRoute);
  private fb        = inject(FormBuilder);

  // ── Données ──
  tab     = signal<TabType>('types');
  types   = signal<any[]>([]);
  statuts = signal<StatutStage[]>([]);

  // ── UI ──
  loading     = signal(false);
  saving      = signal(false);
  slideOpen   = signal(false);
  editingId   = signal<number | null>(null);
  selectedIds = signal<Set<number>>(new Set());
  search      = signal('');
  filterActif = signal<boolean | null>(null);
  filterOpen  = signal(false);
  currentPage = signal(1);
  readonly pageSize = 10;

  readonly COULEURS = [
    '#8b5cf6','#6366f1','#10b981','#3b82f6','#f59e0b',
    '#ef4444','#ec4899','#06b6d4','#f97316','#64748b'
  ];

  // ── Formulaires séparés ──
  formType: FormGroup = this.fb.group({
    code:             ['', [Validators.required, Validators.pattern('^[A-Z0-9_]+$')]],
    libelle:          ['', Validators.required],
    description:      [''],
    dureeMinSemaines: [null],
    dureeMaxSemaines: [null],
    actif:            [true]
  });

  formStatut: FormGroup = this.fb.group({
    code:           ['', [Validators.required, Validators.pattern('^[A-Z0-9_]+$')]],
    libelle:        ['', Validators.required],
    couleur:        ['#8b5cf6'],
    ordreAffichage: [0],
    actif:          [true]
  });

  /** Retourne le formulaire actif selon l'onglet */
  get form(): FormGroup {
    return this.tab() === 'types' ? this.formType : this.formStatut;
  }

  // ════════════════════════════════════════════════════════════
  // COMPUTED
  // ════════════════════════════════════════════════════════════

  currentList = computed(() => {
    const q    = this.search().toLowerCase();
    const list = this.tab() === 'types'
      ? (this.types()   as any[])
      : (this.statuts() as any[]);
    let filtered = list.filter((i: any) =>
      !q || i.libelle?.toLowerCase().includes(q) || i.code?.toLowerCase().includes(q));
    if (this.filterActif() !== null)
      filtered = filtered.filter((i: any) => i.actif === this.filterActif());
    return filtered;
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.currentList().length / this.pageSize)));

  pagesArr = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  pagedList = computed(() => {
    const s = (this.currentPage() - 1) * this.pageSize;
    return this.currentList().slice(s, s + this.pageSize);
  });

  countActifs   = computed(() => this.currentList().filter((i: any) => i.actif).length);
  countInactifs = computed(() => this.currentList().filter((i: any) => !i.actif).length);

  activeFiltersCount = computed(() => this.filterActif() !== null ? 1 : 0);

  allPageSelected = computed(() =>
    this.pagedList().length > 0 &&
    this.pagedList().every((i: any) => this.selectedIds().has(i.id)));

  somePageSelected = computed(() =>
    this.pagedList().some((i: any) => this.selectedIds().has(i.id)) &&
    !this.allPageSelected());

  tabLabel = computed(() =>
    this.tab() === 'types' ? 'Types de stage' : 'Statuts de stage');

  isTypes = computed(() => this.tab() === 'types');

  // ════════════════════════════════════════════════════════════
  // PERMISSIONS
  // ════════════════════════════════════════════════════════════

  canViewTypes()   { return this.perms.canSeeTypeStageMenu(); }
  canCreateTypes() { return this.perms.canCreateTypeStage(); }
  canEditTypes()   { return this.perms.canEditTypeStage(); }
  canDeleteTypes() { return this.perms.canDeleteTypeStage(); }

  canViewStatuts()   { return this.perms.canViewStatutStage(); }
  canCreateStatuts() { return this.perms.canCreateStatutStage(); }
  canEditStatuts()   { return this.perms.canEditStatutStage(); }
  canDeleteStatuts() { return this.perms.canDeleteStatutStage(); }

  canViewCurrent():   boolean { return this.tab() === 'types' ? this.canViewTypes()   : this.canViewStatuts(); }
  canCreateCurrent(): boolean { return this.tab() === 'types' ? this.canCreateTypes() : this.canCreateStatuts(); }
  canEditCurrent():   boolean { return this.tab() === 'types' ? this.canEditTypes()   : this.canEditStatuts(); }
  canDeleteCurrent(): boolean { return this.tab() === 'types' ? this.canDeleteTypes() : this.canDeleteStatuts(); }

  // ════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const tabParam = params.get('tab') as TabType;
      if (tabParam === 'types' || tabParam === 'statuts') {
        this.tab.set(tabParam);
      } else {
        if (this.canViewTypes() || this.canCreateTypes()) {
          this.tab.set('types');
        } else if (this.canViewStatuts() || this.canCreateStatuts()) {
          this.tab.set('statuts');
        }
      }
    });
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    if (this.canViewTypes() || this.canCreateTypes()) {
      this.typeSvc.getTypesStage().subscribe({
        next: (d: any[]) => this.types.set(d),
        error: () => {}
      });
    }
    if (this.canViewStatuts() || this.canCreateStatuts()) {
      this.statutSvc.getAll().subscribe({
        next: (d: StatutStage[]) => { this.statuts.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    } else {
      this.loading.set(false);
    }
  }

  // ════════════════════════════════════════════════════════════
  // NAVIGATION ONGLETS
  // ════════════════════════════════════════════════════════════

  switchTab(t: TabType): void {
    this.tab.set(t);
    this.search.set('');
    this.filterActif.set(null);
    this.currentPage.set(1);
    this.selectedIds.set(new Set());
    this.router.navigate(['/referentiel-stage', t], { replaceUrl: false });
  }

  // ════════════════════════════════════════════════════════════
  // SÉLECTION BULK
  // ════════════════════════════════════════════════════════════

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
        this.pagedList().forEach((i: any) => n.delete(i.id));
        return n;
      });
    } else {
      this.selectedIds.update(s => {
        const n = new Set(s);
        this.pagedList().forEach((i: any) => n.add(i.id));
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

  // ════════════════════════════════════════════════════════════
  // CRUD
  // ════════════════════════════════════════════════════════════

  openCreate(): void {
    if (!this.canCreateCurrent()) { this.ui.warning('Permission requise.'); return; }
    this.editingId.set(null);
    if (this.tab() === 'types') {
      this.formType.reset({
        code: '', libelle: '', description: '',
        dureeMinSemaines: null, dureeMaxSemaines: null, actif: true
      });
      this.formType.get('code')!.enable();
    } else {
      this.formStatut.reset({ code: '', libelle: '', couleur: '#8b5cf6', ordreAffichage: 0, actif: true });
      this.formStatut.get('code')!.enable();
    }
    this.slideOpen.set(true);
  }

  openEdit(item: any): void {
    if (!this.canEditCurrent()) { this.ui.warning('Permission requise.'); return; }
    this.editingId.set(item.id);
    if (this.tab() === 'types') {
      this.formType.patchValue({
        code:             item.code,
        libelle:          item.libelle,
        description:      item.description || '',
        dureeMinSemaines: item.dureeMinSemaines ?? null,
        dureeMaxSemaines: item.dureeMaxSemaines ?? null,
        actif:            item.actif
      });
      // ✅ Code modifiable
      this.formType.get('code')!.enable();
    } else {
      this.formStatut.patchValue({
        code:           item.code,
        libelle:        item.libelle,
        couleur:        item.couleur || '#8b5cf6',
        ordreAffichage: item.ordreAffichage ?? 0,
        actif:          item.actif
      });
      // ✅ Code modifiable
      this.formStatut.get('code')!.enable();
    }
    this.slideOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw  = this.form.getRawValue();
    const body = { ...raw, code: raw.code?.toUpperCase() };
    const id   = this.editingId();
    const t    = this.tab();

    // 🔍 DEBUG TEMPORAIRE — vérifier ce qui est réellement envoyé

    if (t === 'types') {
      const obs = id
        ? this.typeSvc.updateTypeStage(id, body)
        : this.typeSvc.createTypeStage(body);
      obs.subscribe({
        next: (saved: any) => {
          // 🔍 DEBUG TEMPORAIRE — vérifier ce que le backend renvoie réellement
          this.types.update(l =>
            id ? l.map(x => x.id === saved.id ? saved : x) : [...l, saved]);
          this.slideOpen.set(false);
          this.saving.set(false);
          this.ui.success(id ? 'Mis à jour ✅' : 'Créé ✅');
        },
        error: (e: any) => {
          this.saving.set(false);
          this.ui.error(e?.error?.message || 'Erreur sauvegarde.');
        }
      });
    } else {
      const obs = id ? this.statutSvc.update(id, body) : this.statutSvc.create(body);
      obs.subscribe({
        next: (saved: StatutStage) => {
          // 🔍 DEBUG TEMPORAIRE — vérifier ce que le backend renvoie réellement
          this.statuts.update(l =>
            id ? l.map(x => x.id === saved.id ? saved : x) : [...l, saved]);
          this.slideOpen.set(false);
          this.saving.set(false);
          this.ui.success(id ? 'Mis à jour ✅' : 'Créé ✅');
        },
        error: (e: any) => {
          this.saving.set(false);
          this.ui.error(e?.error?.message || 'Erreur sauvegarde.');
        }
      });
    }
  }

  toggleActif(item: any): void {
    if (!this.canEditCurrent()) return;
    const t = this.tab();
    if (t === 'types') {
      this.typeSvc.toggleTypeStage(item.id, !item.actif).subscribe({
        next: (saved: any) => {
          this.types.update(l => l.map(x => x.id === saved.id ? saved : x));
        }
      });
    } else {
      const obs = item.actif
        ? this.statutSvc.deactivate(item.id)
        : this.statutSvc.activate(item.id);
      obs.subscribe({
        next: (saved: StatutStage) => {
          this.statuts.update(l => l.map(x => x.id === saved.id ? saved : x));
        }
      });
    }
  }

  delete(item: any): void {
    if (!this.canDeleteCurrent()) { this.ui.warning('Permission requise.'); return; }
    this.ui.confirm({
      title: 'Supprimer',
      message: `Supprimer "${item.libelle}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this._deleteById(item.id)
    });
  }

  private _deleteById(id: number): void {
    const t = this.tab();
    if (t === 'types') {
      this.typeSvc.deleteTypeStage(id).subscribe({
        next: () => {
          this.types.update(l => l.filter(x => x.id !== id));
          this.ui.success('Supprimé.');
        }
      });
    } else {
      this.statutSvc.delete(id).subscribe({
        next: () => {
          this.statuts.update(l => l.filter(x => x.id !== id));
          this.ui.success('Supprimé.');
        }
      });
    }
  }

  // ════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════

  setCouleur(c: string): void { this.formStatut.get('couleur')!.setValue(c); }
  toggleFilter(): void { this.filterOpen.set(!this.filterOpen()); }
  resetFilters(): void { this.filterActif.set(null); this.currentPage.set(1); }
  goPage(p: number): void { if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p); }
  minVal(a: number, b: number): number { return Math.min(a, b); }
}