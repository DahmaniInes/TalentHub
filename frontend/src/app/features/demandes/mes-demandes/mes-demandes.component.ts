import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DemandeService } from '../../../services/demande.service';
import { NomenclatureService } from '../../../services/nomenclature.service';
import { UserService } from '../../../services/user.service';
import { KeycloakService } from '../../../services/keycloak.service';
import { UiService } from '../../../services/ui.service';
import { Demande, DemandeRequest, TypeDemande, StatutDemande } from '../../../shared/models/demande.model';
import { Utilisateur } from '../../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';
import { PermissionContextService } from '../../../services/permission-context.service';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../../services/notification.service';
import { CongeService, SoldeConge } from '../../../services/conge.service';

@Component({
  selector: 'app-mes-demandes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './mes-demandes.component.html',
  styleUrls: ['./mes-demandes.component.css']
})
export class MesDemandesComponent implements OnInit {
  private demandeService = inject(DemandeService);
  private nomenclature   = inject(NomenclatureService);
  private userService    = inject(UserService);
  private keycloak       = inject(KeycloakService);
  private ui             = inject(UiService);
  private fb             = inject(FormBuilder);
  private congeSvc = inject(CongeService);

  private notifService = inject(NotificationService);
  private subs = new Subscription();
  readonly permCtx = inject(PermissionContextService);


  demandes    = signal<Demande[]>([]);
  types       = signal<TypeDemande[]>([]);
  statuts     = signal<StatutDemande[]>([]);
  loading     = signal(false);
  currentUser = signal<Utilisateur | null>(null);
  soldeConge = signal<SoldeConge | null>(null);
  // Filtre
  filterOpen     = signal(false);
  searchText     = signal('');
  filterStatutId = signal<number | null>(null);
  filterTypeId   = signal<number | null>(null);

  // Sélection
  selectedIds = signal<Set<number>>(new Set());

  // Slide-over
  slideOpen  = signal(false);
  editingId  = signal<number | null>(null);
  slideError = signal<string | null>(null);

  // Popup commentaire
  commentPopup = signal<string | null>(null);

  // Pagination
  pageSize    = 10;
  currentPage = signal(1);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      typeDemandeId: [null, Validators.required],
      sujet:         ['', [Validators.required, Validators.minLength(3)]],
      description:   [''],
      dateDebut:     [null, Validators.required],   // ✅ obligatoire
      dateFin:       [null, Validators.required],   // ✅ obligatoire  
      nbJours:       [null],
    }, { validators: this.dateRangeValidator }); 
    this.form.get('dateDebut')!.valueChanges.subscribe(() => this.calcNbJours());
    this.form.get('dateFin')!.valueChanges.subscribe(() => this.calcNbJours());
  }

  ngOnInit(): void {
    this.nomenclature.getAllTypes().subscribe({ next: t => this.types.set(t), error: () => {} });
    this.nomenclature.getAllStatuts().subscribe({ next: s => this.statuts.set(s), error: () => {} });
    this.loadUserAndDemandes();
    this.subs.add(
      this.notifService.newNotification$.subscribe(notif => {
          if (notif.type === 'DEMANDE_VALIDEE' || notif.type === 'DEMANDE_REJETEE') {
              // Ma demande a été traitée → recharger silencieusement
              this.loadUserAndDemandes();
          }
      })
  );
}  
ngOnDestroy(): void { this.subs.unsubscribe(); }

private dateRangeValidator(group: FormGroup) {
    const debut = group.get('dateDebut')?.value;
    const fin   = group.get('dateFin')?.value;
    if (debut && fin && new Date(fin) < new Date(debut)) {
        return { dateRange: true };
    }
    return null;
}


private loadUserAndDemandes(): void {
  // ✅ Vérifier la permission avant de charger
  if (!this.permCtx.canViewOwnDemandes() && !this.permCtx.canCreateDemande()) {
      this.ui.warning("Vous n'avez pas la permission de voir vos demandes.");
      this.loading.set(false);
      return;
  }

  this.loading.set(true);
  const kcId = this.keycloak.getKeycloakUserId();
  if (!kcId) { this.loading.set(false); return; }

  this.userService.getUserByKeycloakId(kcId).subscribe({
    next: (u) => {
        this.currentUser.set(u);
        this.congeSvc.getSolde(u.id).subscribe({
          next: s => this.soldeConge.set(s),
          error: () => {}
        });
        this.demandeService.getByUtilisateur(u.id).subscribe({
            next: d => { this.demandes.set(d); this.loading.set(false); },
            error: () => this.loading.set(false)
        });
    },
    error: () => { this.demandes.set([]); this.loading.set(false); }
});
}




  // ── Computed ──
  idEnAttente    = computed(() => this.statuts().find(s => s.code === 'EN_ATTENTE')?.id ?? -1);
  idAcceptee     = computed(() => this.statuts().find(s => s.code === 'ACCEPTEE')?.id  ?? -1);
  countEnAttente = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idEnAttente()).length);
  countAcceptee  = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idAcceptee()).length);

  filtered = computed(() => {
    let list = this.demandes();
    const s = this.searchText().toLowerCase();
    if (s) list = list.filter(d => d.sujet.toLowerCase().includes(s) || this.getTypeName(d.typeDemandeId).toLowerCase().includes(s));
    if (this.filterStatutId()) list = list.filter(d => d.statutDemandeId === this.filterStatutId());
    if (this.filterTypeId())   list = list.filter(d => d.typeDemandeId   === this.filterTypeId());
    return list;
  });

  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  activeFiltersCount = computed(() => (this.filterStatutId() ? 1 : 0) + (this.filterTypeId() ? 1 : 0));

  // Sélection computed
  allPageSelected = computed(() => {
    const p = this.paged();
    return p.length > 0 && p.every(d => this.selectedIds().has(d.id));
  });
  somePageSelected = computed(() => {
    const p = this.paged();
    return p.some(d => this.selectedIds().has(d.id)) && !this.allPageSelected();
  });

  // ── Helpers ──
  getTypeName(id: number)  { return this.types().find(t => t.id === id)?.libelle ?? '—'; }
  getStatut(id: number)    { return this.statuts().find(s => s.id === id); }

  getStatutBadgeClass(id: number): string {
    const code = this.statuts().find(s => s.id === id)?.code ?? '';
    switch (code) {
      case 'EN_ATTENTE': return 'dt-badge dt-badge-pending';
      case 'ACCEPTEE':   return 'dt-badge dt-badge-delivered';
      case 'REJETEE':    return 'dt-badge dt-badge-canceled';
      default:           return 'dt-badge dt-badge-default';
    }
  }

  fmtDate(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]}, ${dt.getFullYear()}`;
  }


  private calcNbJours(): void {
    const debut = this.form.get('dateDebut')?.value;
    const fin   = this.form.get('dateFin')?.value;
    if (debut && fin) {
      const diff = Math.max(0, Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 86400000) + 1);
      this.form.get('nbJours')!.setValue(diff, { emitEvent: false });
    }
  }

  // ── Sélection ──
  toggleSelectAll(): void {
    const paged = this.paged();
    if (this.allPageSelected()) {
      const s = new Set(this.selectedIds()); paged.forEach(d => s.delete(d.id)); this.selectedIds.set(s);
    } else {
      const s = new Set(this.selectedIds()); paged.forEach(d => s.add(d.id)); this.selectedIds.set(s);
    }
  }
  toggleSelect(id: number, event: Event): void {
    event.stopPropagation();
    const s = new Set(this.selectedIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedIds.set(s);
  }
  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  clearSelection(): void { this.selectedIds.set(new Set()); }

  bulkDelete(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;
    this.ui.confirm({
      title: 'Supprimer les demandes',
      message: `Supprimer ${ids.length} demande(s) sélectionnée(s) ?`,
      type: 'danger', confirmLabel: 'Supprimer',
      onConfirm: () => {
        Promise.all(ids.map(id => this.demandeService.delete(id).toPromise())).then(() => {
          this.ui.success(`${ids.length} demande(s) supprimée(s).`);
          this.clearSelection();
          this.loadUserAndDemandes();
        }).catch(() => this.ui.error('Erreur lors de la suppression.'));
      }
    });
  }

  // ── Filtre ──
  toggleFilter(): void { this.filterOpen.update(v => !v); }
  resetFilters(): void { this.filterStatutId.set(null); this.filterTypeId.set(null); this.searchText.set(''); this.currentPage.set(1); }

  // ── Slide-over ──
  openCreate(): void {
    this.editingId.set(null); this.form.reset(); this.slideError.set(null); this.slideOpen.set(true);
  }
  openEdit(d: Demande): void {
    if (!this.peutModifier(d)) return;
    this.editingId.set(d.id);
    this.form.patchValue({ typeDemandeId: d.typeDemandeId, sujet: d.sujet, description: d.description, dateDebut: d.dateDebut, dateFin: d.dateFin, nbJours: d.nbJours });
    this.slideError.set(null); this.slideOpen.set(true);
  }
  closeSlide(): void { this.slideOpen.set(false); this.slideError.set(null); }

  save(): void {
    if (!this.permCtx.canCreateDemande() && !this.editingId()) {
      this.ui.error("Vous n'avez pas la permission de créer une demande.");
      return;
  }
  if (this.form.hasError('dateRange')) {
      this.slideError.set('La date de fin doit être après la date de début.');
      return;
  }
  if (this.form.invalid) {
      this.slideError.set('Veuillez remplir tous les champs obligatoires.');
      return;
  }


    const user = this.currentUser();
    if (!user) { this.slideError.set('Utilisateur non identifié.'); return; }
    this.loading.set(true);
    const enAttente = this.statuts().find(s => s.code === 'EN_ATTENTE')?.id ?? 1;
    const req: DemandeRequest = { utilisateurId: user.id, typeDemandeId: this.form.value.typeDemandeId, statutDemandeId: enAttente, sujet: this.form.value.sujet, description: this.form.value.description, dateDebut: this.form.value.dateDebut, dateFin: this.form.value.dateFin, nbJours: this.form.value.nbJours };
    const id  = this.editingId();
    const obs = id ? this.demandeService.update(id, req) : this.demandeService.create(req);
    obs.subscribe({
      next: () => { this.slideOpen.set(false); this.ui.success(id ? 'Demande modifiée.' : 'Demande créée.'); this.loadUserAndDemandes(); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.slideError.set(err.error?.message || 'Erreur.'); this.loading.set(false); }
    });
  }



  delete(d: Demande): void {
    const isOwn = d.utilisateurId === this.currentUser()?.id;
    if (!this.permCtx.canDeleteDemande(isOwn)) {
        this.ui.error("Vous n'avez pas la permission de supprimer cette demande.");
        return;
    }

    if (!this.peutModifier(d)) return;
    this.ui.confirm({ title: 'Supprimer', message: `Supprimer "${d.sujet}" ?`, type: 'danger', confirmLabel: 'Supprimer',
      onConfirm: () => { this.demandeService.delete(d.id).subscribe({ next: () => { this.ui.success('Supprimée.'); this.loadUserAndDemandes(); }, error: () => this.ui.error('Erreur.') }); }
    });
  }

  showComment(d: Demande, event: Event): void { event.stopPropagation(); this.commentPopup.set(d.commentaireRH ?? null); }
  closeComment(): void { this.commentPopup.set(null); }
  goPage(p: number): void { this.currentPage.set(Math.max(1, Math.min(p, this.totalPages()))); }
  minVal(a: number, b: number): number { return Math.min(a, b); }

  peutModifier(d: Demande): boolean {
    const enAttente = this.getStatut(d.statutDemandeId)?.code === 'EN_ATTENTE';
    if (!enAttente) return false;
    const isOwn = d.utilisateurId === this.currentUser()?.id;
    return this.permCtx.canModifyDemande(isOwn);
}

// Export
exportCsv(): void {
    if (!this.permCtx.canExportDemandes()) {
        this.ui.error("Permission requise : DEMANDE_EXPORT");
        return;
    }
    this.demandeService.exportCsv();
}
}