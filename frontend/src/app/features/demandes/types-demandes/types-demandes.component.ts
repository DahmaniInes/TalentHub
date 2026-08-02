import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NomenclatureService } from '../../../services/nomenclature.service';
import { TypeDemande } from '../../../shared/models/demande.model';
import { UiService } from '../../../services/ui.service';
import { PermissionContextService } from '../../../services/permission-context.service';
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
    readonly permCtx     = inject(PermissionContextService);

    types   = signal<TypeDemande[]>([]);
    loading = signal(false);

    filterOpen  = signal(false);
    searchText  = signal('');
    filterActif = signal<boolean | null>(null);

    // ✅ Sélection
    selectedIds = signal<Set<number>>(new Set());

    slideOpen = signal(false);
    editingId = signal<number | null>(null);

    pageSize    = 10;
    currentPage = signal(1);

    form: FormGroup;

    constructor() {
        this.form = this.fb.group({
            // ✅ Plus de pattern strict — conversion auto en majuscule
            code:        ['', Validators.required],
            libelle:     ['', Validators.required],
            description: [''],
            actif:       [true],
            estConge:    [false]   // ✅ NOUVEAU — marque ce type comme "congé" pour le calcul du solde
        });

        // ✅ Auto-uppercase en temps réel, sans bloquer la saisie ni afficher d'erreur
        this.form.get('code')!.valueChanges.subscribe(val => {
            if (val && /[a-z]/.test(val)) {
                this.form.get('code')!.setValue(val.toUpperCase(), { emitEvent: false });
            }
        });
    }

    ngOnInit(): void {
        if (!this.permCtx.canReadType()) {
            this.ui.warning("Accès refusé : permission DEMANDE_TYPE_READ requise.");
            return;
        }
        this.loadAll();
    }

    loadAll(): void {
        this.loading.set(true);
        this.nomenclature.getAllTypes().subscribe({
            next: t => { this.types.set(t); this.loading.set(false); },
            error: () => this.loading.set(false)
        });
    }

    countActifs   = computed(() => this.types().filter(t =>  t.actif).length);
    countInactifs = computed(() => this.types().filter(t => !t.actif).length);

    filtered = computed(() => {
        let list = this.types();
        const s = this.searchText().toLowerCase();
        if (s) list = list.filter(t => t.code.toLowerCase().includes(s) || t.libelle.toLowerCase().includes(s));
        const actif = this.filterActif();
        if (actif !== null) list = list.filter(t => t.actif === actif);
        return list;
    });

    paged      = computed(() => this.filtered().slice((this.currentPage()-1)*this.pageSize, this.currentPage()*this.pageSize));
    totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
    pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i+1));
    activeFiltersCount = computed(() => this.filterActif() !== null ? 1 : 0);

    // ── Sélection ──
    allPageSelected = computed(() => {
        const p = this.paged();
        return p.length > 0 && p.every(t => this.selectedIds().has(t.id));
    });
    somePageSelected = computed(() => {
        const p = this.paged();
        return p.some(t => this.selectedIds().has(t.id)) && !this.allPageSelected();
    });

    toggleSelectAll(): void {
        const p = this.paged();
        const s = new Set(this.selectedIds());
        this.allPageSelected() ? p.forEach(t => s.delete(t.id)) : p.forEach(t => s.add(t.id));
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

    // ── Bulk delete ──
    bulkDelete(): void {
        if (!this.permCtx.canDeleteType()) { this.ui.error("Permission requise : DEMANDE_TYPE_DELETE"); return; }
        const ids = Array.from(this.selectedIds());
        this.ui.confirm({
            title: 'Supprimer les types',
            message: `Supprimer ${ids.length} type(s) ?`,
            type: 'danger', confirmLabel: 'Supprimer',
            onConfirm: () => {
                Promise.all(ids.map(id => this.nomenclature.deleteType(id).toPromise()))
                    .then(() => { this.ui.success(`${ids.length} type(s) supprimé(s).`); this.clearSelection(); this.loadAll(); })
                    .catch(() => this.ui.error('Erreur lors de la suppression.'));
            }
        });
    }

    toggleFilter() { this.filterOpen.update(v => !v); }
    resetFilters() { this.filterActif.set(null); this.searchText.set(''); this.currentPage.set(1); }

    openCreate(): void {
        if (!this.permCtx.canCreateType()) { this.ui.error("Permission requise : DEMANDE_TYPE_CREATE"); return; }
        this.editingId.set(null);
        this.form.reset({ code: '', libelle: '', description: '', actif: true, estConge: false });
        this.form.get('code')!.enable();
        this.slideOpen.set(true);
    }

    openEdit(t: TypeDemande): void {
        if (!this.permCtx.canUpdateType()) { this.ui.error("Permission requise : DEMANDE_TYPE_UPDATE"); return; }
        this.editingId.set(t.id);
        this.form.patchValue(t);
        // ✅ Le code est désormais modifiable en édition
        this.form.get('code')!.enable();
        this.slideOpen.set(true);
    }

    closeSlide() { this.slideOpen.set(false); }

    save(): void {
        if (this.form.invalid) { this.ui.error('Champs obligatoires manquants.'); return; }
        this.loading.set(true);
        const id  = this.editingId();
        const val = { ...this.form.getRawValue() };
        // ✅ Sécurité supplémentaire — toujours majuscule avant l'envoi
        val.code  = (val.code || '').toUpperCase();
        const obs = id ? this.nomenclature.updateType(id, val) : this.nomenclature.createType(val);
        obs.subscribe({
            next: () => { this.slideOpen.set(false); this.ui.success(id ? 'Type modifié.' : 'Type créé.'); this.loadAll(); this.loading.set(false); },
            error: (err: HttpErrorResponse) => { this.ui.error(err.error?.message || 'Erreur.'); this.loading.set(false); }
        });
    }

    // ✅ Toggle actif/inactif avec vérification de permission
    toggleActif(t: TypeDemande, e: Event): void {
        e.stopPropagation();
        const perm = t.actif ? 'DEMANDE_TYPE_DEACTIVATE' : 'DEMANDE_TYPE_ACTIVATE';
        if (!this.permCtx.can(perm)) { this.ui.error(`Permission requise : ${perm}`); return; }
        const obs = t.actif ? this.nomenclature.deactivateType(t.id) : this.nomenclature.activateType(t.id);
        obs.subscribe({
            next: () => { this.ui.success(t.actif ? 'Type désactivé.' : 'Type activé.'); this.loadAll(); },
            error: () => this.ui.error('Erreur.')
        });
    }

    delete(t: TypeDemande): void {
        if (!this.permCtx.canDeleteType()) { this.ui.error("Permission requise : DEMANDE_TYPE_DELETE"); return; }
        this.ui.confirm({
            title: 'Supprimer le type', message: `Supprimer "${t.libelle}" ?`,
            type: 'danger', confirmLabel: 'Supprimer',
            onConfirm: () => {
                this.nomenclature.deleteType(t.id).subscribe({
                    next: () => { this.ui.success('Type supprimé.'); this.loadAll(); },
                    error: (err: HttpErrorResponse) => this.ui.error(err.error?.message || 'Erreur.')
                });
            }
        });
    }

    exportCsv(): void {
        if (!this.permCtx.canExportTypes()) { this.ui.error("Permission requise : DEMANDE_TYPE_EXPORT"); return; }
        this.nomenclature.exportTypesCsv();
    }

    goPage(p: number) { this.currentPage.set(Math.max(1, Math.min(p, this.totalPages()))); }

    minVal(a: number, b: number): number { return Math.min(a, b); }
}