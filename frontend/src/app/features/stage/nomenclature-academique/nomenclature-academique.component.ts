import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NomenclatureAcademiqueService } from '../../../services/nomenclature-academique-service.service';
import { PermissionContextService }      from '../../../services/permission-context.service';
import { UiService }                     from '../../../services/ui.service';

type TabType = 'universites' | 'specialites' | 'niveaux';

@Component({
  selector: 'app-nomenclature-academique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nomenclature-academique.component.html'
})
export class NomenclatureAcademiqueComponent implements OnInit {

  private svc = inject(NomenclatureAcademiqueService);
  readonly perms = inject(PermissionContextService);
  readonly ui = inject(UiService);

  tab = signal<TabType>('universites');

  universites = signal<any[]>([]);
  specialites = signal<any[]>([]);
  niveaux     = signal<any[]>([]);
  loading     = signal(false);
  saving      = signal(false);

  search       = signal('');
  slideOpen    = signal(false);
  editingId    = signal<number | null>(null);
  selectedIds  = signal<Set<number>>(new Set());

  currentPage  = signal(1);
  readonly pageSize = 15;

  form = signal<any>({ code: '', libelle: '', description: '', ordreAffichage: null, actif: true });

  currentList = computed(() => {
    const q = this.search().toLowerCase();
    const list = this.tab() === 'universites' ? this.universites()
               : this.tab() === 'specialites' ? this.specialites()
               : this.niveaux();
    return list.filter(item =>
      !q || item.libelle?.toLowerCase().includes(q) || item.code?.toLowerCase().includes(q));
  });

  pagedList = computed(() => {
    const s = (this.currentPage() - 1) * this.pageSize;
    return this.currentList().slice(s, s + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.currentList().length / this.pageSize)));
  pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  allPageSelected  = computed(() => this.pagedList().length > 0 && this.pagedList().every(i => this.selectedIds().has(i.id)));
  somePageSelected = computed(() => this.pagedList().some(i => this.selectedIds().has(i.id)) && !this.allPageSelected());
  countActifs      = computed(() => this.currentList().filter(i => i.actif).length);

  tabLabel = computed(() => ({
    universites: 'Universités',
    specialites: 'Spécialités',
    niveaux: 'Niveaux d\'étude'
  })[this.tab()]);

  // ── Permissions par onglet ──
  canViewCurrent():   boolean {
    return this.tab() === 'universites' ? this.perms.canViewUniv()
         : this.tab() === 'specialites' ? this.perms.canViewSpec()
         : this.perms.canViewLevel();
  }
  canCreateCurrent(): boolean {
    return this.tab() === 'universites' ? this.perms.canCreateUniv()
         : this.tab() === 'specialites' ? this.perms.canCreateSpec()
         : this.perms.canCreateLevel();
  }
  canEditCurrent(): boolean {
    return this.tab() === 'universites' ? this.perms.canEditUniv()
         : this.tab() === 'specialites' ? this.perms.canEditSpec()
         : this.perms.canEditLevel();
  }
  canDeleteCurrent(): boolean {
    return this.tab() === 'universites' ? this.perms.canDeleteUniv()
         : this.tab() === 'specialites' ? this.perms.canDeleteSpec()
         : this.perms.canDeleteLevel();
  }

  ngOnInit(): void {
    // Initialiser sur le premier onglet accessible
    if (this.perms.canViewUniv() || this.perms.canCreateUniv()) {
      this.tab.set('universites');
    } else if (this.perms.canViewSpec() || this.perms.canCreateSpec()) {
      this.tab.set('specialites');
    } else if (this.perms.canViewLevel() || this.perms.canCreateLevel()) {
      this.tab.set('niveaux');
    }
    this.loadAll();
  }

  
  loadAll(): void {
    this.loading.set(true);
    if (this.perms.canViewUniv() || this.perms.canCreateUniv())
      this.svc.getAllUniversites().subscribe({ next: d => this.universites.set(d) });
    if (this.perms.canViewSpec() || this.perms.canCreateSpec())
      this.svc.getAllSpecialites().subscribe({ next: d => this.specialites.set(d) });
    if (this.perms.canViewLevel() || this.perms.canCreateLevel())
      this.svc.getAllNiveaux().subscribe({
        next: d => { this.niveaux.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    else this.loading.set(false);
  }

  switchTab(t: TabType): void { this.tab.set(t); this.search.set(''); this.currentPage.set(1); this.selectedIds.set(new Set()); }

  // ── Sélection ──
  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  toggleSelect(id: number): void {
    this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  toggleSelectAll(): void {
    if (this.allPageSelected()) {
      this.selectedIds.update(s => { const n = new Set(s); this.pagedList().forEach(i => n.delete(i.id)); return n; });
    } else {
      this.selectedIds.update(s => { const n = new Set(s); this.pagedList().forEach(i => n.add(i.id)); return n; });
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
        ids.forEach(id => this.deleteById(id));
        this.clearSelection();
      }
    });
  }

  // ── CRUD ──
  openCreate(): void {
    this.editingId.set(null);
    this.form.set({ code: '', libelle: '', description: '', ordreAffichage: null, actif: true });
    this.slideOpen.set(true);
  }

  openEdit(item: any): void {
    this.editingId.set(item.id);
    this.form.set({ code: item.code, libelle: item.libelle, description: item.description || '', ordreAffichage: item.ordreAffichage || null, actif: item.actif });
    this.slideOpen.set(true);
  }

  save(): void {
    if (!this.form().libelle?.trim()) { this.ui.warning('Le libellé est obligatoire.'); return; }
    if (!this.editingId() && !this.form().code?.trim()) { this.ui.warning('Le code est obligatoire.'); return; }
    this.saving.set(true);
    const t = this.tab(); const id = this.editingId();
    let obs;
    if (id) {
      obs = t === 'universites' ? this.svc.updateUniversite(id, this.form())
          : t === 'specialites' ? this.svc.updateSpecialite(id, this.form())
          : this.svc.updateNiveau(id, this.form());
    } else {
      obs = t === 'universites' ? this.svc.createUniversite(this.form())
          : t === 'specialites' ? this.svc.createSpecialite(this.form())
          : this.svc.createNiveau(this.form());
    }
    obs.subscribe({
      next: saved => {
        if (t === 'universites') this.universites.update(l => id ? l.map(x => x.id === saved.id ? saved : x) : [...l, saved]);
        else if (t === 'specialites') this.specialites.update(l => id ? l.map(x => x.id === saved.id ? saved : x) : [...l, saved]);
        else this.niveaux.update(l => id ? l.map(x => x.id === saved.id ? saved : x) : [...l, saved]);
        this.slideOpen.set(false); this.saving.set(false);
        this.ui.success(id ? 'Mis à jour ✅' : 'Créé ✅');
      },
      error: (err) => { this.saving.set(false); this.ui.error(err?.error?.message || 'Erreur.'); }
    });
  }

  toggleActif(item: any): void {
    const t = this.tab();
    const obs = t === 'universites' ? this.svc.toggleUniversite(item.id, !item.actif)
              : t === 'specialites' ? this.svc.toggleSpecialite(item.id, !item.actif)
              : this.svc.toggleNiveau(item.id, !item.actif);
    obs.subscribe({
      next: saved => {
        if (t === 'universites') this.universites.update(l => l.map(x => x.id === saved.id ? saved : x));
        else if (t === 'specialites') this.specialites.update(l => l.map(x => x.id === saved.id ? saved : x));
        else this.niveaux.update(l => l.map(x => x.id === saved.id ? saved : x));
      }
    });
  }

  delete(item: any): void {
    this.ui.confirm({
      title: 'Supprimer', message: `Supprimer "${item.libelle}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this.deleteById(item.id)
    });
  }

  private deleteById(id: number): void {
    const t = this.tab();
    const obs = t === 'universites' ? this.svc.deleteUniversite(id)
              : t === 'specialites' ? this.svc.deleteSpecialite(id)
              : this.svc.deleteNiveau(id);
    obs.subscribe({
      next: () => {
        if (t === 'universites') this.universites.update(l => l.filter(x => x.id !== id));
        else if (t === 'specialites') this.specialites.update(l => l.filter(x => x.id !== id));
        else this.niveaux.update(l => l.filter(x => x.id !== id));
        this.ui.success('Supprimé.');
      }
    });
  }

  goPage(p: number): void { if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p); }
  minVal(a: number, b: number): number { return Math.min(a, b); }
}