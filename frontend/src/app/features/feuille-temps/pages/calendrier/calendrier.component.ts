// calendrier.component.ts — FULLCALENDAR + INTÉGRATION OUTLOOK
import { Component, inject, OnInit, AfterViewInit, ViewChild, signal, computed, effect, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router'; // ✅ NOUVEAU
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import { CalendarOptions, EventInput, EventDropArg } from '@fullcalendar/core';
import frLocale from '@fullcalendar/core/locales/fr';
import { EventResizeDoneArg } from '@fullcalendar/interaction';
import { FeuilleTempsService }      from '../../../../services/feuille-temps.service';
import { ProjetService }            from '../../../../services/projet.service';
import { ActiviteService }          from '../../../../services/activite.service';
import { UserService }              from '../../../../services/user.service';
import { KeycloakService }          from '../../../../services/keycloak.service';
import { UiService }                from '../../../../services/ui.service';
import { ErrorService }             from '../../../../services/error.service';
import { PermissionContextService } from '../../../../services/permission-context.service';
import { DemandeService }           from '../../../../services/demande.service';
import { NomenclatureService }      from '../../../../services/nomenclature.service';
import { JoursFeriesService, JourFerie } from '../../../../services/jours-feries.service';
import { OutlookService }           from '../../../../services/outlook.service'; // ✅ NOUVEAU
import { FeuilleTemps, LigneFeuilleTempsRequest } from '../../../../shared/models/feuille-temps.model';
import { Projet }      from '../../../../shared/models/projet.model';
import { Activite }    from '../../../../shared/models/activite.model';
import { Utilisateur } from '../../../../shared/models/utilisateur.model';
import { Demande, TypeDemande, StatutDemande } from '../../../../shared/models/demande.model';
import { HttpErrorResponse } from '@angular/common/http';
import { GroupeService, MembreInfo } from '../../../../services/groupe.service';

export type VueCal = 'mois' | 'semaine' | 'jour' | 'annee';

export interface EntreeCal {
  id?:           number;
  feuilleId:     number;
  feuilleStatut: string;
  utilisateurId: number;
  date:          string;
  projetId?:     number;  projetNom?:   string;
  activiteId?:   number;  activiteNom?: string;
  clientId?:     number;  clientNom?:   string;
  heureDebut?:   string;  heureFin?:    string;
  minutesTravaillees:     number;
  minutesSupplementaires: number;
  commentaire?:  string;
  couleur:       string;
}

export interface FormCal {
  date:               string;
  projetId?:          number;
  activiteId?:        number;
  heureDebut:         string;
  heureFin:           string;
  minutesTravaillees: number;
  commentaire:        string;
}

export interface EntreeRecente {
  activiteId?:  number;  activiteNom?: string;
  projetId?:    number;  projetNom?:   string;
  clientId?:    number;  clientNom?:   string;
  heureDebut?:  string;  heureFin?:    string;
  minutesTravaillees: number;
  couleur:      string;
  cle:          string;
}

@Component({
  selector: 'app-calendrier-ft',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule],
  templateUrl: './calendrier.component.html',
  styleUrls: ['./calendrier.component.css']
})
export class CalendrierFtComponent implements OnInit, AfterViewInit {

  private ftSvc         = inject(FeuilleTempsService);
  private projetSvc     = inject(ProjetService);
  private activiteSvc   = inject(ActiviteService);
  private userSvc       = inject(UserService);
  private keycloak      = inject(KeycloakService);
  readonly ui           = inject(UiService);
  private errorSvc      = inject(ErrorService);
  readonly perms        = inject(PermissionContextService);
  private groupeSvc     = inject(GroupeService);
  private demandeSvc    = inject(DemandeService);
  private nomenclature  = inject(NomenclatureService);
  private joursFeriesSvc = inject(JoursFeriesService);
  private outlookSvc    = inject(OutlookService); // ✅ NOUVEAU
  private route         = inject(ActivatedRoute); // ✅ NOUVEAU
  private readonly STATUT_TERMINE_ID = 4;
  private ngZone = inject(NgZone);
  @ViewChild('calendarRef') calendarComponent?: FullCalendarComponent;

  currentUser      = signal<Utilisateur | null>(null);
  selectedUser     = signal<Utilisateur | null>(null);
  utilisateursDropdown = signal<MembreInfo[]>([]);
  feuilles         = signal<FeuilleTemps[]>([]);
  projets          = signal<Projet[]>([]);
  activitesGlobales   = signal<Activite[]>([]);
  activitesParProjet  = signal<Record<number, Activite[]>>({});

  demandes = signal<Demande[]>([]);
  typesDemande = signal<TypeDemande[]>([]);
  statutsDemande = signal<StatutDemande[]>([]);
  joursFeries = signal<JourFerie[]>([]);

  outlookConnecte = signal(false); // ✅ NOUVEAU

  loading = signal(false);
  saving  = signal(false);

  canReadOwn    = computed(() => this.perms.can('TS_OWN_READ'));
  canCreateOwn  = computed(() => this.perms.can('TS_OWN_CREATE'));
  canUpdateOwn  = computed(() => this.perms.can('TS_OWN_UPDATE'));
  canDeleteOwn  = computed(() => this.perms.can('TS_OWN_DELETE'));
  canReadAll    = computed(() => this.perms.can('TS_ALL_READ'));
  canUpdateAll  = computed(() => this.perms.can('TS_ALL_UPDATE'));
  canReadGroup  = computed(() => this.perms.can('TS_GROUP_READ'));
  canUpdateGroup = computed(() => this.perms.can('TS_GROUP_UPDATE'));

  canViewCalendar = computed(() =>
    this.canReadOwn() || this.canReadAll() || this.canReadGroup()
  );

  canModify = computed(() => {
    const isOwn = this.selectedUser()?.id === this.currentUser()?.id;
    if (isOwn) return this.canUpdateOwn() || this.canCreateOwn();
    return this.canUpdateAll() || this.canUpdateGroup();
  });

  dateCourante = signal<Date>(new Date());
  vue          = signal<VueCal>('semaine');

  detailEntree    = signal<EntreeCal | null>(null);
  formulaireOpen  = signal(false);
  formulaireMode  = signal<'ajout' | 'edition'>('ajout');
  entreeEnEdition = signal<EntreeCal | null>(null);
  form: FormCal = this.newForm('', '08:00');

  draggingRecente = signal<EntreeRecente | null>(null);

  readonly COULEURS = ['#6366f1','#8b5cf6','#10b981','#f97316','#ef4444',
                       '#3b82f6','#c026d3','#eab308','#06b6d4','#84cc16'];

  private _couleurs: Record<string, string> = {};
  private _ci = 0;
  couleurProjet(pid?: number): string {
    const k = String(pid ?? '0');
    if (!this._couleurs[k]) this._couleurs[k] = this.COULEURS[this._ci++ % this.COULEURS.length];
    return this._couleurs[k];
  }

  private readonly PALETTE_DEMANDE = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];
  couleurTypeDemande(typeId: number): string {
    return this.PALETTE_DEMANDE[typeId % this.PALETTE_DEMANDE.length];
  }

  entreesRecentes = signal<EntreeRecente[]>([]);

  private loadUtilisateursDropdown(): void {
    const me = this.currentUser();
    if (!me) return;
    if (this.canReadAll() || this.canUpdateAll()) {
      this.groupeSvc.getTousMembresDeGroupes(me.id).subscribe({
        next: d => this.utilisateursDropdown.set(d),
        error: () => this.utilisateursDropdown.set([])
      });
    } else if (this.canReadGroup() || this.canUpdateGroup()) {
      this.groupeSvc.getCoequipiers(me.id).subscribe({
        next: d => this.utilisateursDropdown.set(d),
        error: () => this.utilisateursDropdown.set([])
      });
    }
  }

  private loadEntreesRecentes(utilisateurId: number): void {
    this.ftSvc.getActivitesRecentesDisponibles(utilisateurId).subscribe({
      next: dtos => {
        const projets = this.projets();
        const recentes: EntreeRecente[] = dtos
          .filter(d => {
            if (!d.activiteId) return true;
            const activitesDuProjet = d.projetId ? (this.activitesParProjet()[d.projetId] ?? []) : [];
            const activite = activitesDuProjet.find(a => a.id === d.activiteId)
                           ?? this.activitesGlobales().find(a => a.id === d.activiteId);
            return !!activite && activite.statutActiviteId !== this.STATUT_TERMINE_ID;
          })
          .map(d => {
            const projet = projets.find(p => p.id === d.projetId);
            const activitesDuProjet = d.projetId ? (this.activitesParProjet()[d.projetId] ?? []) : [];
            const activite = activitesDuProjet.find(a => a.id === d.activiteId)
                           ?? this.activitesGlobales().find(a => a.id === d.activiteId);
            return {
              cle: `${d.projetId ?? 'null'}-${d.activiteId ?? 'null'}`,
              activiteId: d.activiteId,
              activiteNom: activite?.nom,
              projetId: d.projetId,
              projetNom: projet?.nom,
              clientId: d.clientId,
              clientNom: undefined,
              heureDebut: d.heureDebut,
              heureFin: d.heureFin,
              minutesTravaillees: d.minutesTravaillees,
              couleur: this.couleurProjet(d.projetId),
            };
          });
        this.entreesRecentes.set(recentes);
      },
      error: () => this.entreesRecentes.set([])
    });
  }

  private loadDemandes(utilisateurId: number): void {
    this.demandeSvc.getByUtilisateur(utilisateurId).subscribe({
      next: d => this.demandes.set(d),
      error: () => this.demandes.set([])
    });
  }

  private chargerJoursFeries(): void {
    const annee = new Date().getFullYear();
    this.joursFeriesSvc.getParAnnee(annee).subscribe({
      next: j => this.joursFeries.update(existants => [...existants, ...j])
    });
    this.joursFeriesSvc.getParAnnee(annee + 1).subscribe({
      next: j => this.joursFeries.update(existants => [...existants, ...j])
    });
  }

  // ✅ NOUVEAU — statut de connexion Outlook
  private verifierStatutOutlook(utilisateurId: number): void {
    this.outlookSvc.status(utilisateurId).subscribe({
      next: r => this.outlookConnecte.set(r.connected),
      error: () => this.outlookConnecte.set(false)
    });
  }

  connecterOutlook(): void {
    const user = this.currentUser();
    if (!user) return;
    this.outlookSvc.connect(user.id).subscribe({
      next: r => window.location.href = r.url,
      error: () => this.ui.error('Impossible de démarrer la connexion Outlook.')
    });
  }

  deconnecterOutlook(): void {
    const user = this.currentUser();
    if (!user) return;
    this.ui.confirm({
      title: 'Déconnecter Outlook',
      message: 'Vos futures entrées ne seront plus synchronisées avec Outlook. Continuer ?',
      confirmLabel: 'Déconnecter', type: 'danger',
      onConfirm: () => {
        this.outlookSvc.disconnect(user.id).subscribe({
          next: () => { this.outlookConnecte.set(false); this.ui.success('Outlook déconnecté.'); },
          error: () => this.ui.error('Erreur lors de la déconnexion.')
        });
      }
    });
  }

  labelNav = computed(() => {
    const d = this.dateCourante();
    if (this.vue() === 'annee') return `${d.getFullYear()}`;
    if (this.vue() === 'mois') return `${d.toLocaleDateString('fr-FR', { month:'long', year:'numeric' })}`;
    if (this.vue() === 'jour') return d.toLocaleDateString('fr-FR', {
      weekday:'long', day:'numeric', month:'long', year:'numeric'
    });
    const lundi = this.lundiDe(d);
    const dim   = new Date(lundi); dim.setDate(dim.getDate() + 6);
    return `${lundi.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${dim.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`;
  });

  entreesDate(date: string): EntreeCal[] {
    const res: EntreeCal[] = [];
    for (const ft of this.feuilles()) {
      for (const l of ft.lignes ?? []) {
        const lDate = typeof l.date === 'string' ? l.date : String(l.date);
        if (lDate === date) {
          res.push({
            id: l.id, feuilleId: ft.id, feuilleStatut: ft.statut,
            utilisateurId: ft.utilisateurId, date,
            projetId:    l.projetId,   projetNom:   l.projetNom,
            activiteId:  l.activiteId, activiteNom: l.activiteNom,
            clientId:    l.clientId,   clientNom:   l.clientNom,
            heureDebut:  l.heureDebut, heureFin:    l.heureFin,
            minutesTravaillees:     l.minutesTravaillees,
            minutesSupplementaires: l.minutesSupplementaires,
            commentaire: l.commentaire,
            couleur:     this.couleurProjet(l.projetId),
          });
        }
      }
    }
    return res.sort((a, b) => (a.heureDebut || '00:00').localeCompare(b.heureDebut || '00:00'));
  }

  totalDate(date: string): number {
    return this.entreesDate(date).reduce(
      (s, e) => s + e.minutesTravaillees + e.minutesSupplementaires, 0
    );
  }

  private toutesLesDatesConnues(): string[] {
    const dates = new Set<string>();
    for (const ft of this.feuilles()) {
      for (const l of ft.lignes ?? []) {
        dates.add(typeof l.date === 'string' ? l.date : String(l.date));
      }
    }
    return [...dates];
  }

  private addOneDay(dateStr: string): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  private toutesLesActivitesConnues(): Map<number, string> {
    const m = new Map<number, string>();
    for (const a of this.activitesGlobales()) m.set(a.id, a.nom);
    for (const liste of Object.values(this.activitesParProjet())) {
      for (const a of liste) m.set(a.id, a.nom);
    }
    return m;
  }

  entreesEvents = computed<EventInput[]>(() => {
    const evts: EventInput[] = [];
    const activitesConnues = this.toutesLesActivitesConnues();
    for (const date of this.toutesLesDatesConnues()) {
      for (const e of this.entreesDate(date)) {
        const editable = this.peutDrag(e);
        const heureDebut = e.heureDebut || '08:00';
        const dureeMinutes = e.minutesTravaillees + e.minutesSupplementaires || 60;
        let heureFin = e.heureFin;
        if (!heureFin) {
          const [h, m] = heureDebut.split(':').map(Number);
          const totalMin = h * 60 + m + dureeMinutes;
          const fh = Math.min(23, Math.floor(totalMin / 60));
          const fm = totalMin % 60;
          heureFin = `${String(fh).padStart(2,'0')}:${String(fm).padStart(2,'0')}`;
        }

        let titre: string;
        if (e.activiteId) {
          titre = e.activiteNom || activitesConnues.get(e.activiteId) || 'Activité';
        } else if (e.projetId) {
          titre = e.projetNom || this.projets().find(p => p.id === e.projetId)?.nom || 'Projet';
        } else {
          titre = 'Sans activité';
        }

        evts.push({
          id: 'entree-' + e.id,
          title: titre,
          start: `${e.date}T${heureDebut}:00`,
          end: `${e.date}T${heureFin}:00`,
          allDay: false,
          backgroundColor: e.couleur,
          borderColor: e.couleur,
          editable,
          durationEditable: editable,
          startEditable: editable,
          extendedProps: { type: 'entree', entree: e }
        });
      }
    }
    return evts;
  });

  demandesEvents = computed<EventInput[]>(() => {
    const idAcceptee = this.statutsDemande().find(s => s.code === 'ACCEPTEE')?.id;
    if (idAcceptee == null) return [];
    return this.demandes()
      .filter(d => d.statutDemandeId === idAcceptee && d.dateDebut)
      .map(d => {
        const couleur = this.couleurTypeDemande(d.typeDemandeId);
        const typeName = this.typesDemande().find(t => t.id === d.typeDemandeId)?.libelle ?? 'Congé';
        const dateFinExclusive = d.dateFin ? this.addOneDay(d.dateFin) : this.addOneDay(d.dateDebut!);
        return {
          id: 'demande-' + d.id,
          title: '🏖 ' + typeName,
          start: d.dateDebut,
          end: dateFinExclusive,
          allDay: true,
          display: 'block',
          backgroundColor: couleur,
          borderColor: couleur,
          editable: false,
          extendedProps: { type: 'demande' }
        } as EventInput;
      });
  });

  joursFeriesEvents = computed<EventInput[]>(() =>
    this.joursFeries().map(j => ({
      id: 'ferie-' + j.date,
      title: '🎌 ' + j.localName,
      start: j.date,
      end: this.addOneDay(j.date),
      allDay: true,
      display: 'block',
      backgroundColor: '#94a3b8',
      borderColor: '#94a3b8',
      editable: false,
      extendedProps: { type: 'ferie' }
    }))
  );

  tousLesEvents = computed<EventInput[]>(() =>
    [...this.entreesEvents(), ...this.demandesEvents(), ...this.joursFeriesEvents()]
  );

  readonly calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    locale: frLocale,
    headerToolbar: false,
    height: 'auto',
    weekends: true,
    slotMinTime: '08:00:00',
    slotMaxTime: '24:00:00',
    allDaySlot: true,
    editable: true,
    eventStartEditable: true,
    eventDurationEditable: true,
    events: (info, successCallback) => {
      successCallback(this.tousLesEvents());
    },
    eventDidMount: (info) => {
      info.el.setAttribute('title', info.event.title);
    },
    dateClick: (arg) => {
      this.ngZone.run(() => {
        const [datePart, timePart] = arg.dateStr.split('T');
        this.ouvrirAjout(datePart, timePart?.substring(0, 5));
      });
    },
    eventClick: (info) => {
      this.ngZone.run(() => {
        const type = info.event.extendedProps['type'];
        if (type !== 'entree') return;
        const e = info.event.extendedProps['entree'] as EntreeCal;
        this.ouvrirDetail(e);
      });
    },
    eventDrop: (arg: EventDropArg) => {
      this.ngZone.run(() => this.onEventDrop(arg));
    },
    eventResize: (arg: EventResizeDoneArg) => {
      this.ngZone.run(() => this.onEventResize(arg));
    }
  };

  private syncVue(): void {
    const api = this.calendarComponent?.getApi();
    if (!api) return;
    const fcView = this.vue() === 'annee'   ? 'multiMonthYear'
                 : this.vue() === 'mois'    ? 'dayGridMonth'
                 : this.vue() === 'jour'    ? 'timeGridDay'
                 : 'timeGridWeek';
    api.changeView(fcView, this.dateCourante());
  }

  private refetchEvents(): void {
    const api = this.calendarComponent?.getApi();
    if (!api) return;
    api.refetchEvents();
  }

  constructor() {
    effect(() => {
      this.tousLesEvents();
      this.refetchEvents();
    });
    effect(() => {
      this.vue(); this.dateCourante();
      this.syncVue();
    });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.syncVue();
        this.refetchEvents();
      });
    });
  }

  private onEventDrop(arg: EventDropArg): void {
    const entree = arg.event.extendedProps['entree'] as EntreeCal | undefined;
    if (!entree) { arg.revert(); return; }

    const nouvelleDate = arg.event.startStr.split('T')[0];
    const nouvelleHeureDebut = arg.event.startStr.split('T')[1]?.substring(0, 5);
    const nouvelleHeureFin   = arg.event.endStr?.split('T')[1]?.substring(0, 5);

    const ft = this.feuilles().find(f => f.id === entree.feuilleId);
    if (!ft) { arg.revert(); return; }

    const lignes = (ft.lignes ?? []).map(l => {
      if (l.id !== entree.id) return this.ligneVersRequest(l);
      return {
        ...this.ligneVersRequest(l),
        date: nouvelleDate,
        heureDebut: nouvelleHeureDebut ?? l.heureDebut,
        heureFin: nouvelleHeureFin ?? l.heureFin,
        estWeekend: FeuilleTempsService.isWeekend(nouvelleDate)
      };
    });

    this.ftSvc.update(ft.id, {
      utilisateurId: ft.utilisateurId, semaineDu: ft.semaineDu, semaineAu: ft.semaineAu,
      statut: ft.statut, lignes
    }).subscribe({
      next: u => {
        this.feuilles.update(fs => fs.map(f => f.id === u.id ? u : f));
        this.ui.success('Entrée déplacée ✅');
        this.notifierSiAutreUser(nouvelleDate);
      },
      error: (err: HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); arg.revert(); }
    });
  }

  private onEventResize(arg: EventResizeDoneArg): void {
    const entree = arg.event.extendedProps['entree'] as EntreeCal | undefined;
    if (!entree) { arg.revert(); return; }

    const debut = arg.event.start!;
    const fin   = arg.event.end!;
    const minutes = Math.round((fin.getTime() - debut.getTime()) / 60000);

    const ft = this.feuilles().find(f => f.id === entree.feuilleId);
    if (!ft) { arg.revert(); return; }

    const lignes = (ft.lignes ?? []).map(l =>
      l.id === entree.id
        ? { ...this.ligneVersRequest(l), minutesTravaillees: minutes }
        : this.ligneVersRequest(l)
    );

    this.ftSvc.update(ft.id, {
      utilisateurId: ft.utilisateurId, semaineDu: ft.semaineDu, semaineAu: ft.semaineAu,
      statut: ft.statut, lignes
    }).subscribe({
      next: u => { this.feuilles.update(fs => fs.map(f => f.id === u.id ? u : f)); this.ui.success('Durée modifiée ✅'); },
      error: (err: HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); arg.revert(); }
    });
  }

  private ligneVersRequest(l: any): LigneFeuilleTempsRequest {
    return {
      date: typeof l.date === 'string' ? l.date : String(l.date),
      projetId: l.projetId, activiteId: l.activiteId, clientId: l.clientId,
      heureDebut: l.heureDebut, heureFin: l.heureFin,
      minutesTravaillees: l.minutesTravaillees, minutesSupplementaires: l.minutesSupplementaires,
      commentaire: l.commentaire, estWeekend: l.estWeekend ?? false
    };
  }

  onRecenteDragStart(event: DragEvent, r: EntreeRecente): void {
    if (!this.canModify()) { event.preventDefault(); return; }
    this.draggingRecente.set(r);
    event.dataTransfer?.setData('type', 'recente');
  }

  onCalendarWrapperDragOver(event: DragEvent): void {
    if (this.draggingRecente()) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    }
  }

  onCalendarWrapperDrop(event: DragEvent): void {
    const r = this.draggingRecente();
    if (!r) return;
    event.preventDefault();

    const target = event.target as HTMLElement;
    const dayEl = target.closest('[data-date]') as HTMLElement | null;
    if (!dayEl) { this.draggingRecente.set(null); return; }
    const date = dayEl.getAttribute('data-date')!;

    const slotEl = target.closest('.fc-timegrid-slot') as HTMLElement | null;
    const heure = slotEl?.getAttribute('data-time')?.substring(0, 5);

    const heureDebut = heure || '08:00';
    const [dh, dm] = heureDebut.split(':').map(Number);
    const heureFin = `${String(Math.min(dh + 1, 23)).padStart(2, '0')}:${String(dm).padStart(2, '0')}`;

    this.form = {
      date, projetId: r.projetId, activiteId: r.activiteId,
      heureDebut, heureFin, minutesTravaillees: 60, commentaire: ''
    };
    if (r.projetId) this.loadActivitesDuProjet(r.projetId);
    this.formulaireMode.set('ajout');
    this.entreeEnEdition.set(null);
    this.detailEntree.set(null);
    this.formulaireOpen.set(true);
    this.draggingRecente.set(null);
  }

  ngOnInit(): void {
    this.chargerJoursFeries();
    this.nomenclature.getAllTypes().subscribe({ next: t => this.typesDemande.set(t), error: () => {} });
    this.nomenclature.getAllStatuts().subscribe({ next: s => this.statutsDemande.set(s), error: () => {} });

    // ✅ NOUVEAU — lire le paramètre de retour de redirection Outlook
    this.route.queryParams.subscribe(params => {
      if (params['outlook'] === 'connecte') {
        this.ui.success('Outlook connecté avec succès ✅');
        const user = this.currentUser();
        if (user) this.verifierStatutOutlook(user.id);
      }
    });

    const kcId = this.keycloak.getKeycloakUserId();
    if (!kcId) { this.loadFeuilles(); return; }

    this.userSvc.getUserByKeycloakId(kcId).subscribe({
      next: u => {
        this.currentUser.set(u);
        this.selectedUser.set(u);
        this.verifierStatutOutlook(u.id); // ✅ NOUVEAU

        this.projetSvc.getVisiblesPourFeuilleTemps(u.id).subscribe({
          next: ps => {
            this.projets.set(ps);
            const projetActivitePromises = ps.map(p => Promise.all([
              new Promise<void>(resolve => {
                this.activiteSvc.getByProjet(p.id).subscribe({
                  next: d => { this.activitesParProjet.update(m => ({ ...m, [p.id]: d })); resolve(); },
                  error: () => resolve()
                });
              }),
              new Promise<void>(resolve => {
                this.activiteSvc.getGlobalesDisponiblesPourProjet(p.id).subscribe({
                  next: d => {
                    this.activitesGlobales.update(g => {
                      const ids = new Set(g.map(a => a.id));
                      return [...g, ...d.filter(a => !ids.has(a.id))];
                    });
                    resolve();
                  },
                  error: () => resolve()
                });
              })
            ]));

            Promise.all(projetActivitePromises).then(() => {
              this.loadFeuilles(u.id);
              this.loadEntreesRecentes(u.id);
              this.loadDemandes(u.id);
              this.loadUtilisateursDropdown();
              this.ngZone.runOutsideAngular(() => this.refetchEvents());
            });
          },
          error: () => {
            this.loadFeuilles(u.id);
            this.loadEntreesRecentes(u.id);
            this.loadDemandes(u.id);
            this.loadUtilisateursDropdown();
          }
        });
      },
      error: () => this.loadFeuilles()
    });
  }

  loadFeuilles(userId?: number): void {
    if (!this.canViewCalendar()) return;
    this.loading.set(true);
    const id = userId ?? this.selectedUser()?.id;
    const obs = id ? this.ftSvc.getByUtilisateur(id) : this.ftSvc.getAll();
    obs.subscribe({
      next: d  => { this.feuilles.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onUserChange(val: string): void {
    const me = this.currentUser();
    const id = val ? +val : me?.id;
    if (!id || (me && id === me.id)) {
      this.selectedUser.set(me ?? null);
      if (me) { this.loadFeuilles(me.id); this.loadEntreesRecentes(me.id); this.loadDemandes(me.id); }
      return;
    }
    this.userSvc.getUserById(id).subscribe({
      next: user => {
        this.selectedUser.set(user);
        this.loadFeuilles(user.id);
        this.loadEntreesRecentes(user.id);
        this.loadDemandes(user.id);
      },
      error: () => this.ui.error("Erreur lors du chargement de l'utilisateur sélectionné.")
    });
  }

  loadActivitesDuProjet(projetId: number): void {
    if (this.activitesParProjet()[projetId]) return;
    this.activiteSvc.getByProjet(projetId).subscribe({
      next: d => this.activitesParProjet.update(m => ({ ...m, [projetId]: d }))
    });
  }

  onFormProjetChange(): void {
    this.form.activiteId = undefined;
    if (this.form.projetId) this.loadActivitesDuProjet(this.form.projetId);
  }

  onFormHeuresChange(): void {
    if (this.form.heureDebut && this.form.heureFin) {
      const [dh, dm] = this.form.heureDebut.split(':').map(Number);
      const [fh, fm] = this.form.heureFin.split(':').map(Number);
      const tot = (fh*60+fm) - (dh*60+dm);
      if (tot > 0) this.form.minutesTravaillees = tot;
    }
  }

  naviguer(delta: number): void {
    const d = new Date(this.dateCourante());
    if (this.vue() === 'annee')   d.setFullYear(d.getFullYear() + delta);
    if (this.vue() === 'mois')    d.setMonth(d.getMonth() + delta);
    if (this.vue() === 'semaine') d.setDate(d.getDate() + delta * 7);
    if (this.vue() === 'jour')    d.setDate(d.getDate() + delta);
    this.dateCourante.set(d);
  }
  allerAujourdhui(): void { this.dateCourante.set(new Date()); }
  changerVue(v: VueCal): void { this.vue.set(v); }

  private newForm(date: string, heureDebut = '08:00'): FormCal {
    const [h, m] = heureDebut.split(':').map(Number);
    const heureFin = `${String(Math.min(h+1, 23)).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    return {
      date, projetId: undefined, activiteId: undefined,
      heureDebut, heureFin, minutesTravaillees: 60, commentaire: ''
    };
  }

  ouvrirAjout(date: string, heure?: string): void {
    if (!this.canModify()) {
      this.ui.warning("Vous n'avez pas la permission d'ajouter une entrée.");
      return;
    }
    this.form = this.newForm(date, heure || '08:00');
    this.formulaireMode.set('ajout');
    this.entreeEnEdition.set(null);
    this.detailEntree.set(null);
    this.formulaireOpen.set(true);
  }

  ouvrirDetail(e: EntreeCal): void {
    this.detailEntree.set(e);
    this.formulaireOpen.set(false);
  }

  ouvrirEdition(e: EntreeCal): void {
    if (!this.canModify()) { this.ui.warning("Vous n'avez pas la permission de modifier."); return; }
    this.form = {
      date: e.date, projetId: e.projetId, activiteId: e.activiteId,
      heureDebut: e.heureDebut || '08:00', heureFin: e.heureFin || '09:00',
      minutesTravaillees: e.minutesTravaillees, commentaire: e.commentaire || ''
    };
    if (e.projetId) this.loadActivitesDuProjet(e.projetId);
    this.formulaireMode.set('edition');
    this.entreeEnEdition.set(e);
    this.detailEntree.set(null);
    this.formulaireOpen.set(true);
  }

  fermerFormulaire(): void { this.formulaireOpen.set(false); this.entreeEnEdition.set(null); }
  fermerDetail(): void { this.detailEntree.set(null); }

  private getOrCreateFeuille(date: string): { ft: FeuilleTemps | null; lundiDate: string } {
    const user = this.selectedUser() ?? this.currentUser();
    if (!user) return { ft: null, lundiDate: '' };
    const lundiDate = FeuilleTempsService.getLundiSemaine(new Date(date));
    const ft = this.feuilles().find(f =>
      f.semaineDu === lundiDate && f.utilisateurId === user.id &&
      (f.statut === 'BROUILLON' || f.statut === 'REJETEE')
    ) ?? null;
    return { ft, lundiDate };
  }

  private buildLignesExistantes(ft: FeuilleTemps): LigneFeuilleTempsRequest[] {
    return (ft.lignes ?? []).map(l => this.ligneVersRequest(l));
  }

  private notifierSiAutreUser(date: string): void {
    const me  = this.currentUser();
    const sel = this.selectedUser();
    if (!me || !sel || me.id === sel.id || !sel.keycloakId) return;
    const nomMe  = `${me.prenom || ''} ${me.nom || ''}`.trim();
    const lundi  = FeuilleTempsService.getLundiSemaine(new Date(date));
    this.ftSvc.notifierModification(sel.keycloakId, nomMe, lundi).subscribe({ error: () => {} });
  }

  sauvegarderFormulaire(): void {
    if (!this.canModify()) {
      this.ui.warning("Vous n'avez pas la permission d'effectuer cette action.");
      return;
    }
    if (!this.form.minutesTravaillees || this.form.minutesTravaillees <= 0) {
      this.ui.warning('La durée doit être supérieure à 0.');
      return;
    }
    const user = this.selectedUser() ?? this.currentUser();
    if (!user) { this.ui.warning('Utilisateur non identifié.'); return; }

    const nouvelleLigne: LigneFeuilleTempsRequest = {
      date:          this.form.date,
      projetId:      this.form.projetId,
      activiteId:    this.form.activiteId,
      heureDebut:    this.form.heureDebut,
      heureFin:      this.form.heureFin,
      minutesTravaillees:     this.form.minutesTravaillees,
      minutesSupplementaires: 0,
      commentaire:   this.form.commentaire || undefined,
      estWeekend:    FeuilleTempsService.isWeekend(this.form.date)
    };

    this.saving.set(true);
    const mode = this.formulaireMode();

    if (mode === 'ajout') {
      const { ft: ftExist, lundiDate } = this.getOrCreateFeuille(this.form.date);
      if (ftExist) {
        const lignes = [...this.buildLignesExistantes(ftExist), nouvelleLigne];
        this.ftSvc.update(ftExist.id, {
          utilisateurId: user.id, semaineDu: ftExist.semaineDu, semaineAu: ftExist.semaineAu,
          statut: 'BROUILLON', lignes
        }).subscribe({
          next: ft => {
            this.feuilles.update(fs => fs.map(f => f.id === ft.id ? ft : f));
            this.ui.success('Entrée ajoutée ✅');
            this.fermerFormulaire();
            this.saving.set(false);
            this.notifierSiAutreUser(this.form.date);
          },
          error: (err: HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.saving.set(false); }
        });
      } else {
        this.ftSvc.create({
          utilisateurId: user.id, semaineDu: lundiDate,
          semaineAu: FeuilleTempsService.getVendrediSemaine(lundiDate),
          statut: 'BROUILLON', lignes: [nouvelleLigne]
        }).subscribe({
          next: ft => {
            this.feuilles.update(fs => [...fs, ft]);
            this.ui.success('Entrée ajoutée ✅');
            this.fermerFormulaire();
            this.saving.set(false);
            this.notifierSiAutreUser(this.form.date);
          },
          error: (err: HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.saving.set(false); }
        });
      }
    } else {
      const edition = this.entreeEnEdition();
      if (!edition) return;
      const ft = this.feuilles().find(f => f.id === edition.feuilleId);
      if (!ft || (ft.statut !== 'BROUILLON' && ft.statut !== 'REJETEE')) {
        this.ui.warning('Cette feuille ne peut pas être modifiée.');
        this.saving.set(false);
        return;
      }
      const lignes: LigneFeuilleTempsRequest[] = (ft.lignes ?? []).map(l =>
        l.id === edition.id ? nouvelleLigne : this.ligneVersRequest(l)
      );
      this.ftSvc.update(ft.id, {
        utilisateurId: ft.utilisateurId, semaineDu: ft.semaineDu, semaineAu: ft.semaineAu,
        statut: ft.statut, lignes
      }).subscribe({
        next: u => {
          this.feuilles.update(fs => fs.map(f => f.id === u.id ? u : f));
          this.ui.success('Entrée modifiée ✅');
          this.fermerFormulaire();
          this.saving.set(false);
          this.notifierSiAutreUser(this.form.date);
        },
        error: (err: HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.saving.set(false); }
      });
    }
  }

  supprimerEntree(e: EntreeCal): void {
    if (!this.canModify()) { this.ui.warning("Vous n'avez pas la permission de supprimer."); return; }
    const ft = this.feuilles().find(f => f.id === e.feuilleId);
    if (!ft || (ft.statut !== 'BROUILLON' && ft.statut !== 'REJETEE')) {
      this.ui.warning('Cette feuille ne peut pas être modifiée.'); return;
    }
    this.ui.confirm({
      title: 'Supprimer cette entrée',
      message: `Supprimer "${e.projetNom || 'cette entrée'}" du ${e.date} ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        const lignes = (ft.lignes ?? []).filter(l => l.id !== e.id).map(l => this.ligneVersRequest(l));
        this.ftSvc.update(ft.id, {
          utilisateurId:ft.utilisateurId, semaineDu:ft.semaineDu, semaineAu:ft.semaineAu, statut:ft.statut, lignes
        }).subscribe({
          next: u => { this.feuilles.update(fs => fs.map(f => f.id===u.id ? u : f)); this.ui.success('Entrée supprimée.'); this.fermerDetail(); this.notifierSiAutreUser(e.date); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  peutDrag(e: EntreeCal): boolean {
    return this.canModify() && (e.feuilleStatut === 'BROUILLON' || e.feuilleStatut === 'REJETEE');
  }

  private lundiDe(d: Date): Date {
    const r = new Date(d); r.setDate(r.getDate() - ((r.getDay()+6) % 7)); return r;
  }

  fmtDuree(min: number): string {
    if (!min || min <= 0) return '—';
    const h = Math.floor(min/60); const m = min % 60;
    return m > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`;
  }

  fmtDateFr(ds: string): string {
    return new Date(ds).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  }

  fmtStatut(s: string): string {
    return ({ BROUILLON:'Brouillon', SOUMISE:'Soumise', VALIDEE:'Validée', REJETEE:'Rejetée' } as any)[s] ?? s;
  }

  getInitiales(nomComplet: string): string {
    if (!nomComplet) return '?';
    return nomComplet.split(' ').filter(m => m.length > 0).map(m => m[0].toUpperCase()).slice(0, 2).join('');
  }

  getAvatarColor(nom: string): string {
    if (!nom) return '#6366f1';
    let hash = 0;
    for (let i = 0; i < nom.length; i++) hash = nom.charCodeAt(i) + ((hash << 5) - hash);
    return this.COULEURS[Math.abs(hash) % this.COULEURS.length];
  }

  showUserSelector = computed(() =>
    this.canReadGroup() || this.canUpdateGroup() || this.canReadAll() || this.canUpdateAll()
  );
}