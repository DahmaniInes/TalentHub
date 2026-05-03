import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NomenclatureService } from '../../../services/nomenclature.service';
import { TypeDemande } from '../../../shared/models/demande.model';
import { UiService } from '../../../services/ui.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-types-demandes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './types-demandes.component.html',
  styleUrls: ['./types-demandes.component.css']
})
export class TypesDemandesComponent implements OnInit {
  private nomenclature = inject(NomenclatureService);
  private fb           = inject(FormBuilder);
  private ui           = inject(UiService);

  types   = signal<TypeDemande[]>([]);
  loading = signal(false);

  // Filtre
  filterOpen  = signal(false);
  searchText  = signal('');
  filterActif = signal<boolean | null>(null);

  // Slide-over
  slideOpen = signal(false);
  editingId = signal<number | null>(null);

  // Pagination
  pageSize    = 10;
  currentPage = signal(1);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      code:        ['', Validators.required],
      libelle:     ['', Validators.required],
      description: [''],
      actif:       [true]
    });
  }

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    this.nomenclature.getAllTypes().subscribe({
      next: t => { this.types.set(t); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // ── Computed — PAS de => dans le template ──
  countActifs   = computed(() => this.types().filter(t =>  t.actif).length);
  countInactifs = computed(() => this.types().filter(t => !t.actif).length);

  filtered = computed(() => {
    let list = this.types();
    const s = this.searchText().toLowerCase();
    if (s) list = list.filter(t =>
      t.code.toLowerCase().includes(s) || t.libelle.toLowerCase().includes(s)
    );
    const actif = this.filterActif();
    if (actif !== null) list = list.filter(t => t.actif === actif);
    return list;
  });

  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  activeFiltersCount = computed(() => this.filterActif() !== null ? 1 : 0);

  // ── Actions ──
  toggleFilter(): void { this.filterOpen.update(v => !v); }
  resetFilters(): void { this.filterActif.set(null); this.searchText.set(''); this.currentPage.set(1); }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ actif: true });
    this.form.get('code')!.enable();
    this.slideOpen.set(true);
  }

  openEdit(t: TypeDemande): void {
    this.editingId.set(t.id);
    this.form.patchValue(t);
    this.form.get('code')!.disable();
    this.slideOpen.set(true);
  }

  closeSlide(): void { this.slideOpen.set(false); }

  save(): void {
    if (this.form.invalid) { this.ui.error('Champs obligatoires manquants.'); return; }
    this.loading.set(true);
    const id  = this.editingId();
    const val = { ...this.form.getRawValue() };
    const obs = id ? this.nomenclature.updateType(id, val) : this.nomenclature.createType(val);
    obs.subscribe({
      next: () => {
        this.slideOpen.set(false);
        this.ui.success(id ? 'Type modifié.' : 'Type créé.');
        this.loadAll();
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error(err.error?.message || 'Erreur.');
        this.loading.set(false);
      }
    });
  }

  delete(t: TypeDemande): void {
    this.ui.confirm({
      title: 'Supprimer le type',
      message: `Supprimer "${t.libelle}" ?`,
      type: 'danger',
      confirmLabel: 'Supprimer',
      onConfirm: () => {
        this.nomenclature.deleteType(t.id).subscribe({
          next: () => { this.ui.success('Type supprimé.'); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(err.error?.message || 'Erreur.')
        });
      }
    });
  }

  goPage(p: number): void { this.currentPage.set(Math.max(1, Math.min(p, this.totalPages()))); }
}