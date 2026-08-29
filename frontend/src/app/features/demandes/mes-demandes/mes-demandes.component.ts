import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import frLocale from '@fullcalendar/core/locales/fr';
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
import { JoursFeriesService, JourFerie } from '../../../services/jours-feries.service';

@Component({
  selector: 'app-mes-demandes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FullCalendarModule],
  templateUrl: './mes-demandes.component.html',
  styleUrls: ['./mes-demandes.component.css']
})
export class MesDemandesComponent implements OnInit, OnDestroy {
  private demandeService = inject(DemandeService);
  private nomenclature   = inject(NomenclatureService);
  private userService    = inject(UserService);
  private keycloak       = inject(KeycloakService);
  private ui             = inject(UiService);
  private fb             = inject(FormBuilder);
  private congeSvc = inject(CongeService);
  private joursFeriesSvc = inject(JoursFeriesService);

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

  // ✅ Toggle Table / Calendrier
  vueActive = signal<'table' | 'calendrier'>('table');

  // ✅ Jours fériés — appel direct frontend vers Nager.Date, aucune
  // dépendance backend (voir JoursFeriesService)
  joursFeries = signal<JourFerie[]>([]);

  // ✅ palette de couleurs générée côté frontend uniquement
  private readonly PALETTE_COULEURS = [
    '#6366f1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'
  ];

  getCouleurType(typeId: number): string {
    return this.PALETTE_COULEURS[typeId % this.PALETTE_COULEURS.length];
  }

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      typeDemandeId: [null, Validators.required],
      sujet:         ['', [Validators.required, Validators.minLength(3)]],
      description:   [''],
      dateDebut:     [null, [Validators.required, this.dateNonPasseeValidator]],
      dateFin:       [null, Validators.required],
      nbJours:       [null],
    }, { validators: this.dateRangeValidator });
  }

  ngOnInit(): void {
    this.nomenclature.getAllTypes().subscribe({ next: t => this.types.set(t), error: () => {} });
    this.nomenclature.getAllStatuts().subscribe({ next: s => this.statuts.set(s), error: () => {} });
    this.chargerJoursFeries(); // ✅ NOUVEAU
    this.loadUserAndDemandes();
    this.subs.add(
      this.notifService.newNotification$.subscribe(notif => {
          if (notif.type === 'DEMANDE_VALIDEE' || notif.type === 'DEMANDE_REJETEE') {
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

private dateNonPasseeValidator(control: any) {
    if (!control.value) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const val = new Date(control.value);
    val.setHours(0, 0, 0, 0);
    return val < today ? { dateNonPassee: true } : null;
}

today(): string {
    return new Date().toISOString().split('T')[0];
}

// ✅ NOUVEAU — charge les jours fériés de l'année courante ET suivante
// (couvre le cas où le calendrier affiche janvier de l'année d'après),
// directement depuis Nager.Date, sans passer par le backend TalentHub.
private chargerJoursFeries(): void {
  const annee = new Date().getFullYear();
  this.joursFeriesSvc.getParAnnee(annee).subscribe({
    next: j => this.joursFeries.update(existants => [...existants, ...j])
  });
  this.joursFeriesSvc.getParAnnee(annee + 1).subscribe({
    next: j => this.joursFeries.update(existants => [...existants, ...j])
  });
}


private loadUserAndDemandes(): void {
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

  typeSelectionneEstConge(): boolean {
    const typeId = this.form.get('typeDemandeId')?.value;
    return !!this.types().find(t => t.id === typeId)?.estConge;
  }

  soldeInsuffisant(): boolean {
    if (!this.typeSelectionneEstConge()) return false;
    const jours = this.form.get('nbJours')?.value;
    const solde = this.soldeConge()?.solde;
    if (!jours || solde == null) return false;

    const id = this.editingId();
    const ancienneDemande = id ? this.demandes().find(d => d.id === id) : null;
    const soldeDisponible = solde + (ancienneDemande?.nbJours ?? 0);

    return jours > soldeDisponible;
  }

  private calcNbJours(): void {
    const debut = this.form.get('dateDebut')?.value;
    const fin   = this.form.get('dateFin')?.value;
    if (debut && fin) {
      const diff = Math.max(0, Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 86400000) + 1);
      this.form.get('nbJours')!.setValue(diff, { emitEvent: false });
    }
  }

  onFormFieldChange(): void {
    this.calcNbJours();
  }

  // ✅ Demandes acceptées avec dates → source du calendrier
  demandesAccepteesAvecDates = computed(() =>
    this.demandes().filter(d =>
      this.getStatut(d.statutDemandeId)?.code === 'ACCEPTEE' && d.dateDebut
    )
  );

  // Le titre affiché dans chaque case est le nom du TYPE de demande
  calendarEvents = computed<EventInput[]>(() =>
    this.demandesAccepteesAvecDates().map(d => {
      const couleur = this.getCouleurType(d.typeDemandeId);
      return {
        id: String(d.id),
        title: this.getTypeName(d.typeDemandeId),
        start: d.dateDebut,
        end: d.dateFin ? this.addOneDay(d.dateFin) : d.dateDebut,
        backgroundColor: couleur,
        borderColor: couleur,
        display: 'block',
        extendedProps: { demande: d }
      };
    })
  );

  // ✅ NOUVEAU — événements calendrier pour les jours fériés
  joursFeriesEvents = computed<EventInput[]>(() =>
    this.joursFeries().map(j => ({
      id: 'ferie-' + j.date,
      title: j.localName,
      start: j.date,
      allDay: true,
      display: 'block',
      backgroundColor: '#94a3b8',
      borderColor: '#94a3b8',
      editable: false,
      extendedProps: { estFerie: true }
    }))
  );

  calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [dayGridPlugin, interactionPlugin, multiMonthPlugin],
    initialView: 'dayGridMonth',
    locale: frLocale,
    height: 'auto',
    weekends: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridDay,dayGridWeek,dayGridMonth,multiMonthYear'
    },
    buttonText: {
      today: "Aujourd'hui",
      day: 'Jour',
      week: 'Semaine',
      month: 'Mois',
      year: 'Année'
    },
    events: [...this.calendarEvents(), ...this.joursFeriesEvents()],
    eventDisplay: 'block',
    dayMaxEvents: 3,
    // ✅ NOUVEAU — ajoute un tooltip natif (title HTML) avec le nom complet,
    // visible au survol, même si le texte affiché dans la case est tronqué
    eventDidMount: (info) => {
      info.el.setAttribute('title', info.event.title);
    },
    eventClick: (info) => {
      if (info.event.extendedProps['estFerie']) return;
      const d = this.demandes().find(x => x.id === +info.event.id);
      if (d) this.showComment(d, new Event('click'));
    }
  }));

  private addOneDay(dateStr: string): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  // ✅ Légende avec clés couleur — uniquement les types réellement représentés
  legendeTypes = computed(() => {
    const accepteesParType = new Map<number, number>();
    this.demandesAccepteesAvecDates().forEach(d => {
      accepteesParType.set(d.typeDemandeId, (accepteesParType.get(d.typeDemandeId) ?? 0) + 1);
    });
    return this.types()
      .filter(t => accepteesParType.has(t.id))
      .map(t => ({
        ...t,
        count: accepteesParType.get(t.id) ?? 0,
        couleur: this.getCouleurType(t.id)
      }));
  });

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
  if (this.form.get('dateDebut')?.hasError('dateNonPassee')) {
      this.slideError.set('La date de début ne peut pas être antérieure à aujourd\'hui.');
      return;
  }
  if (this.form.invalid) {
      this.slideError.set('Veuillez remplir tous les champs obligatoires.');
      return;
  }
  if (this.soldeInsuffisant()) {
      this.slideError.set('Solde de congé insuffisant pour cette période.');
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