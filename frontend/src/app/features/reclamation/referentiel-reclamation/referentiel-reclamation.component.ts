// src/app/features/reclamation/referentiel-reclamation/referentiel-reclamation.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReclamationService }       from '../../../services/reclamation.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { UiService }                from '../../../services/ui.service';
import { ServiceReclamation, StatutReclamation } from '../../../shared/models/reclamation.model';

type TabType = 'services' | 'statuts';

@Component({
  selector: 'app-referentiel-reclamation',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './referentiel-reclamation.component.html'
})
export class ReferentielReclamationComponent implements OnInit {

  private recSvc = inject(ReclamationService);
  readonly perms = inject(PermissionContextService);
  readonly ui    = inject(UiService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private fb     = inject(FormBuilder);

  // ── Données ──
  tab      = signal<TabType>('services');
  services = signal<ServiceReclamation[]>([]);
  statuts  = signal<StatutReclamation[]>([]);

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

  // ── Formulaires séparés (même structure mais services distincts) ──
  formService: FormGroup = this.fb.group({
    code:        ['', Validators.required],
    libelle:     ['', Validators.required],
    description: [''],
    actif:       [true]
  });

  formStatut: FormGroup = this.fb.group({
    code:        ['', Validators.required],
    libelle:     ['', Validators.required],
    description: [''],
    actif:       [true]
  });

  constructor() {
    // ✅ Auto-uppercase en temps réel sur les deux formulaires — pas d'erreur, conversion automatique
    this.formService.get('code')!.valueChanges.subscribe(val => {
      if (val && /[a-z]/.test(val)) {
        this.formService.get('code')!.setValue(val.toUpperCase(), { emitEvent: false });
      }
    });
    this.formStatut.get('code')!.valueChanges.subscribe(val => {
      if (val && /[a-z]/.test(val)) {
        this.formStatut.get('code')!.setValue(val.toUpperCase(), { emitEvent: false });
      }
    });
  }

  /** Retourne le formulaire actif selon l'onglet */
  get form(): FormGroup {
    return this.tab() === 'services' ? this.formService : this.formStatut;
  }

  // ════════════════════════════════════════════════════════════
  // COMPUTED
  // ════════════════════════════════════════════════════════════

  currentList = computed(() => {
    const q    = this.search().toLowerCase();
    const list = this.tab() === 'services'
      ? (this.services() as any[])
      : (this.statuts()  as any[]);
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
    this.tab() === 'services' ? 'Services de réclamation' : 'Statuts de réclamation');

  isServices = computed(() => this.tab() === 'services');

  // ════════════════════════════════════════════════════════════
  // PERMISSIONS
  // ════════════════════════════════════════════════════════════

  canViewServices()   { return this.perms.canReadServiceRec(); }
  canCreateServices()  { return this.perms.canCreateServiceRec(); }
  canEditServices()    { return this.perms.canUpdateServiceRec(); }
  canDeleteServices()  { return this.perms.canDeleteServiceRec(); }
  canActivateServices() { return this.perms.canActivateServiceRec(); }
  canDeactivateServices() { return this.perms.canDeactivateServiceRec(); }

  canViewStatuts()   { return this.perms.canReadStatutRec(); }
  canCreateStatuts()  { return this.perms.canCreateStatutRec(); }
  canEditStatuts()    { return this.perms.canUpdateStatutRec(); }
  canDeleteStatuts()  { return this.perms.canDeleteStatutRec(); }
  canActivateStatuts() { return this.perms.canActivateStatutRec(); }
  canDeactivateStatuts() { return this.perms.canDeactivateStatutRec(); }

  canViewCurrent():   boolean { return this.tab() === 'services' ? this.canViewServices()   : this.canViewStatuts(); }
  canCreateCurrent(): boolean { return this.tab() === 'services' ? this.canCreateServices() : this.canCreateStatuts(); }
  canEditCurrent():   boolean { return this.tab() === 'services' ? this.canEditServices()   : this.canEditStatuts(); }
  canDeleteCurrent(): boolean { return this.tab() === 'services' ? this.canDeleteServices() : this.canDeleteStatuts(); }
  canToggleCurrent(item: any): boolean {
    if (this.tab() === 'services') {
      return item.actif ? this.canDeactivateServices() : this.canActivateServices();
    }
    return item.actif ? this.canDeactivateStatuts() : this.canActivateStatuts();
  }

  // ════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const tabParam = params.get('tab') as TabType;
      if (tabParam === 'services' || tabParam === 'statuts') {
        this.tab.set(tabParam);
      } else {
        if (this.canViewServices() || this.canCreateServices()) {
          this.tab.set('services');
        } else if (this.canViewStatuts() || this.canCreateStatuts()) {
          this.tab.set('statuts');
        }
      }
    });
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    if (this.canViewServices() || this.canCreateServices()) {
      this.recSvc.getAllServices().subscribe({
        next: (d: ServiceReclamation[]) => this.services.set(d),
        error: () => {}
      });
    }
    if (this.canViewStatuts() || this.canCreateStatuts()) {
      this.recSvc.getAllStatuts().subscribe({
        next: (d: StatutReclamation[]) => { this.statuts.set(d); this.loading.set(false); },
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
    this.router.navigate(['/referentiel-reclamation', t], { replaceUrl: false });
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
    if (!this.canDeleteCurrent()) { this.ui.warning('Permission requise.'); return; }
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
    if (this.tab() === 'services') {
      this.formService.reset({ code: '', libelle: '', description: '', actif: true });
      this.formService.get('code')!.enable();
    } else {
      this.formStatut.reset({ code: '', libelle: '', description: '', actif: true });
      this.formStatut.get('code')!.enable();
    }
    this.slideOpen.set(true);
  }

  openEdit(item: any): void {
    if (!this.canEditCurrent()) { this.ui.warning('Permission requise.'); return; }
    this.editingId.set(item.id);
    if (this.tab() === 'services') {
      this.formService.patchValue({
        code: item.code, libelle: item.libelle,
        description: item.description || '', actif: item.actif
      });
      // ✅ Code modifiable
      this.formService.get('code')!.enable();
    } else {
      this.formStatut.patchValue({
        code: item.code, libelle: item.libelle,
        description: item.description || '', actif: item.actif
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
    const body = { ...raw, code: (raw.code || '').toUpperCase() };
    const id   = this.editingId();
    const t    = this.tab();

    // 🔍 DEBUG TEMPORAIRE

    if (t === 'services') {
      const obs = id ? this.recSvc.updateService(id, body) : this.recSvc.createService(body);
      obs.subscribe({
        next: (saved: ServiceReclamation) => {
          this.services.update(l =>
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
      const obs = id ? this.recSvc.updateStatut(id, body) : this.recSvc.createStatut(body);
      obs.subscribe({
        next: (saved: StatutReclamation) => {
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
    if (!this.canToggleCurrent(item)) { this.ui.warning('Permission requise.'); return; }
    const t = this.tab();
    if (t === 'services') {
      const obs = item.actif
        ? this.recSvc.deactivateService(item.id)
        : this.recSvc.activateService(item.id);
      obs.subscribe({
        next: (saved: ServiceReclamation) => {
          this.services.update(l => l.map(x => x.id === saved.id ? saved : x));
        }
      });
    } else {
      const obs = item.actif
        ? this.recSvc.deactivateStatut(item.id)
        : this.recSvc.activateStatut(item.id);
      obs.subscribe({
        next: (saved: StatutReclamation) => {
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
    if (t === 'services') {
      this.recSvc.deleteService(id).subscribe({
        next: () => {
          this.services.update(l => l.filter(x => x.id !== id));
          this.ui.success('Supprimé.');
        }
      });
    } else {
      this.recSvc.deleteStatut(id).subscribe({
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

  getServiceColor(code: string): string {
    const map: Record<string, string> = {
      IT: '#3b82f6', RH: '#10b981', FINANCE: '#f59e0b',
      LOGISTIQUE: '#8b5cf6', AUTRE: '#64748b'
    };
    return map[code] || 'var(--accent)';
  }

  getStatutColor(code: string): string {
    const map: Record<string, string> = {
      EN_ATTENTE: '#f59e0b', EN_COURS: '#3b82f6',
      RESOLUE: '#10b981', REJETEE: '#ef4444', FERMEE: '#64748b'
    };
    return map[code] || 'var(--accent)';
  }

  getCurrentColor(item: any): string {
    return this.tab() === 'services'
      ? this.getServiceColor(item.code)
      : this.getStatutColor(item.code);
  }

  toggleFilter(): void { this.filterOpen.set(!this.filterOpen()); }
  resetFilters(): void { this.filterActif.set(null); this.currentPage.set(1); }
  goPage(p: number): void { if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p); }
  minVal(a: number, b: number): number { return Math.min(a, b); }
}