// src/app/features/nomenclature/priorite-activite/priorite-activite.component.ts

import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PrioriteActiviteService } from '../../../services/priorite-activite.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { UiService } from '../../../services/ui.service';
import { PrioriteActivite, PrioriteActiviteRequest } from '../../../shared/models/priorite-activite.model';

@Component({
  selector: 'app-priorite-activite',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './priorite-activite.component.html',
  styleUrls: ['./priorite-activite.component.css']
})
export class PrioriteActiviteComponent implements OnInit {

  private svc  = inject(PrioriteActiviteService);
  readonly perms = inject(PermissionContextService);
  private ui   = inject(UiService);
  private fb   = inject(FormBuilder);

  // ── Données ──
  items     = signal<PrioriteActivite[]>([]);
  loading   = signal(false);

  // ── UI ──
  slideOpen   = signal(false);
  filterOpen  = signal(false);
  editingId   = signal<number | null>(null);

  // ── Filtres & recherche ──
  searchText  = signal('');
  filterActif = signal<boolean | null>(null);
  currentPage = signal(1);
  readonly pageSize = 10;

  // ── Sélection (bulk) ──
  selectedIds = signal<Set<number>>(new Set());

  // ── Couleurs proposées dans le sélecteur ──
  readonly COULEURS = [
    '#10b981','#3b82f6','#f97316','#ef4444',
    '#8b5cf6','#ec4899','#06b6d4','#eab308',
    '#64748b','#c026d3','#0d41f6','#00c2ff'
  ];

  // ── Formulaire ──
  form: FormGroup = this.fb.group({
    code:        ['', [Validators.required, Validators.pattern('^[A-Z0-9_]+$')]],
    libelle:     ['', Validators.required],
    description: [''],
    couleur:     ['#10b981'],
    ordre:       [0],
    actif:       [true]
  });

  // ════════════════════════════════════════════════════════════
  // COMPUTED
  // ════════════════════════════════════════════════════════════

  filtered = computed(() => {
    let list = this.items();
    const q = this.searchText().toLowerCase();
    if (q) list = list.filter(i =>
      i.libelle.toLowerCase().includes(q) ||
      i.code.toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q));
    if (this.filterActif() !== null)
      list = list.filter(i => i.actif === this.filterActif());
    return list;
  });

  totalPages  = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  pagesArr    = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  paged       = computed(() => {
    const s = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(s, s + this.pageSize);
  });

  countActifs   = computed(() => this.items().filter(i => i.actif).length);
  countInactifs = computed(() => this.items().filter(i => !i.actif).length);

  activeFiltersCount = computed(() => {
    let n = 0;
    if (this.searchText())       n++;
    if (this.filterActif() !== null) n++;
    return n;
  });

  // Sélection (bulk)
  allPageSelected  = computed(() =>
    this.paged().length > 0 && this.paged().every(i => this.selectedIds().has(i.id)));
  somePageSelected = computed(() =>
    this.paged().some(i => this.selectedIds().has(i.id)) && !this.allPageSelected());
  isSelected = (id: number) => this.selectedIds().has(id);

  // ════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ════════════════════════════════════════════════════════════

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: data => { this.items.set(data); this.loading.set(false); },
      error: ()   => { this.ui.error('Erreur de chargement.'); this.loading.set(false); }
    });
  }

  // ════════════════════════════════════════════════════════════
  // FILTRE / RECHERCHE
  // ════════════════════════════════════════════════════════════

  toggleFilter(): void { this.filterOpen.set(!this.filterOpen()); }

  resetFilters(): void {
    this.searchText.set('');
    this.filterActif.set(null);
    this.currentPage.set(1);
  }

  goPage(p: number): void { this.currentPage.set(p); }
  minVal(a: number, b: number): number { return Math.min(a, b); }

  // ════════════════════════════════════════════════════════════
  // SÉLECTION BULK
  // ════════════════════════════════════════════════════════════

  toggleSelect(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const s = new Set(this.selectedIds());
    checked ? s.add(id) : s.delete(id);
    this.selectedIds.set(s);
  }

  toggleSelectAll(): void {
    if (this.allPageSelected()) {
      const s = new Set(this.selectedIds());
      this.paged().forEach(i => s.delete(i.id));
      this.selectedIds.set(s);
    } else {
      const s = new Set(this.selectedIds());
      this.paged().forEach(i => s.add(i.id));
      this.selectedIds.set(s);
    }
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  bulkDelete(): void {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    this.ui.confirm({
      title: 'Supprimer',
      message: `Supprimer ${ids.length} priorité(s) ?`,
      type: 'danger', confirmLabel: 'Supprimer',
      onConfirm: () => this.svc.deleteBulk(ids).subscribe({
        next: () => {
          this.items.update(l => l.filter(i => !ids.includes(i.id)));
          this.selectedIds.set(new Set());
          this.ui.success('Supprimées.');
        },
        error: () => this.ui.error('Erreur lors de la suppression.')
      })
    });
  }

  // ════════════════════════════════════════════════════════════
  // SLIDE-OVER CRUD
  // ════════════════════════════════════════════════════════════

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ code: '', libelle: '', description: '', couleur: '#10b981', ordre: 0, actif: true });
    // Activer le champ code en création
    this.form.get('code')!.enable();
    this.slideOpen.set(true);
  }

  openEdit(item: PrioriteActivite): void {
    this.editingId.set(item.id);
    this.form.patchValue({
      code: item.code, libelle: item.libelle,
      description: item.description || '', couleur: item.couleur,
      ordre: item.ordre, actif: item.actif
    });
    // Code non modifiable après création
    this.form.get('code')!.disable();
    this.slideOpen.set(true);
  }

  closeSlide(): void { this.slideOpen.set(false); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    const raw = this.form.getRawValue(); // getRawValue inclut les champs disabled
    const req: PrioriteActiviteRequest = {
      code:        raw.code?.toUpperCase(),
      libelle:     raw.libelle,
      description: raw.description,
      couleur:     raw.couleur,
      ordre:       raw.ordre ?? 0,
      actif:       raw.actif
    };

    const editId = this.editingId();
    const op = editId
      ? this.svc.update(editId, req)
      : this.svc.create(req);

    op.subscribe({
      next: saved => {
        if (editId) {
          this.items.update(l => l.map(i => i.id === saved.id ? saved : i));
        } else {
          this.items.update(l => [...l, saved].sort((a, b) => a.ordre - b.ordre));
        }
        this.slideOpen.set(false);
        this.loading.set(false);
        this.ui.success(editId ? 'Priorité mise à jour ✅' : 'Priorité créée ✅');
      },
      error: (e) => {
        this.loading.set(false);
        this.ui.error(e?.error?.message || 'Erreur lors de la sauvegarde.');
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // TOGGLE ACTIF / SUPPRIMER
  // ════════════════════════════════════════════════════════════

  toggleActif(item: PrioriteActivite, event: Event): void {
    event.stopPropagation();
    this.svc.toggle(item.id).subscribe({
      next: updated => {
        this.items.update(l => l.map(i => i.id === updated.id ? updated : i));
        this.ui.success(updated.actif ? 'Priorité activée.' : 'Priorité désactivée.');
      },
      error: () => this.ui.error('Erreur.')
    });
  }

  delete(item: PrioriteActivite): void {
    this.ui.confirm({
      title: 'Supprimer',
      message: `Supprimer la priorité "${item.libelle}" ?`,
      type: 'danger', confirmLabel: 'Supprimer',
      onConfirm: () => this.svc.delete(item.id).subscribe({
        next: () => {
          this.items.update(l => l.filter(i => i.id !== item.id));
          this.ui.success('Supprimée.');
        },
        error: () => this.ui.error('Erreur lors de la suppression.')
      })
    });
  }

  // ── Helpers ──
  setCouleur(c: string): void { this.form.get('couleur')!.setValue(c); }
  setActif(v: boolean): void  { this.form.get('actif')!.setValue(v); }
}