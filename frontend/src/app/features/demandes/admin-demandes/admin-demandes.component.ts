// admin-demandes.component.ts — REMPLACE complet
import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
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
import { NotificationService } from '../../../services/notification.service';
import { Demande, TypeDemande, StatutDemande } from '../../../shared/models/demande.model';
import { Utilisateur } from '../../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';
import { PermissionContextService } from '../../../services/permission-context.service';
import { CongeService, SoldeConge } from '../../../services/conge.service';
import { JoursFeriesService, JourFerie } from '../../../services/jours-feries.service';

type StatutTab = 'EN_ATTENTE' | 'ACCEPTEE' | 'REJETEE';

@Component({
    selector: 'app-admin-demandes',
    standalone: true,
    imports: [CommonModule, FormsModule, FullCalendarModule],
    templateUrl: './admin-demandes.component.html',
    styleUrls: ['./admin-demandes.component.css']
})
export class AdminDemandesComponent implements OnInit, OnDestroy {
    private demandeService = inject(DemandeService);
    private nomenclature   = inject(NomenclatureService);
    private userService    = inject(UserService);
    private keycloak       = inject(KeycloakService);
    private ui             = inject(UiService);
    private notifService   = inject(NotificationService);
    private congeSvc       = inject(CongeService);
    private joursFeriesSvc = inject(JoursFeriesService);
    readonly permCtx       = inject(PermissionContextService);

    demandes     = signal<Demande[]>([]);
    types        = signal<TypeDemande[]>([]);
    statuts      = signal<StatutDemande[]>([]);
    utilisateurs = signal<Utilisateur[]>([]);
    loading      = signal(false);

    filterOpen     = signal(false);
    searchText     = signal('');
    filterTypeId   = signal<number | null>(null);
    selectedIds    = signal<Set<number>>(new Set());

    vueActive = signal<'table' | 'calendrier'>('table');
    statutTab = signal<StatutTab>('EN_ATTENTE');

    traitementModal  = signal<Demande | null>(null);
    commentaireRH    = signal('');
    selectedStatutId = signal<number | null>(null);
    traitLoading     = signal(false);
    traitError       = signal<string | null>(null);
    commentPopup     = signal<string | null>(null);

    soldeUtilisateur = signal<SoldeConge | null>(null);

    tauxActuel  = signal<number>(1.8);
    editingTaux = signal(false);
    tauxTemp    = signal(1.8);

    pageSize    = 10;
    currentPage = signal(1);

    joursFeries = signal<JourFerie[]>([]);

    private readonly PALETTE_COULEURS = [
        '#6366f1', '#10b981', '#ef4444', '#f59e0b', '#3b82f6',
        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'
    ];
    getCouleurType(typeId: number): string {
        return this.PALETTE_COULEURS[typeId % this.PALETTE_COULEURS.length];
    }

    private subs = new Subscription();

    ngOnInit(): void {
        this.nomenclature.getAllTypes().subscribe({ next: t => this.types.set(t), error: () => {} });
        this.nomenclature.getAllStatuts().subscribe({ next: s => this.statuts.set(s), error: () => {} });
        this.userService.getAllUsers().subscribe({ next: u => this.utilisateurs.set(u), error: () => {} });
        this.congeSvc.getTauxActuel().subscribe({
            next: t => { this.tauxActuel.set(t.tauxMensuel); this.tauxTemp.set(t.tauxMensuel); },
            error: () => {}
        });
        this.chargerJoursFeries();
        this.loadAll();

        this.subs.add(
            this.notifService.newNotification$.subscribe(notif => {
                if (notif.type === 'DEMANDE_SOUMISE') {
                    this.loadAllSilent();
                    this.ui.success('Nouvelle demande reçue !');
                }
            })
        );
    }

    ngOnDestroy(): void { this.subs.unsubscribe(); }

    loadAll(): void {
        this.loading.set(true);
        this.demandeService.getAll().subscribe({
            next: d => { this.demandes.set(d); this.loading.set(false); },
            error: () => this.loading.set(false)
        });
    }

    private loadAllSilent(): void {
        this.demandeService.getAll().subscribe({
            next: d => this.demandes.set(d),
            error: () => {}
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

    // ── Computed ──
    idEnAttente    = computed(() => this.statuts().find(s => s.code === 'EN_ATTENTE')?.id ?? -1);
    idAcceptee     = computed(() => this.statuts().find(s => s.code === 'ACCEPTEE')?.id  ?? -1);
    idRejetee      = computed(() => this.statuts().find(s => s.code === 'REJETEE')?.id   ?? -1);
    countEnAttente = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idEnAttente()).length);
    countAcceptee  = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idAcceptee()).length);
    countRejetee   = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idRejetee()).length);

    private idPourTab(tab: StatutTab): number {
        return tab === 'EN_ATTENTE' ? this.idEnAttente()
             : tab === 'ACCEPTEE'   ? this.idAcceptee()
             : this.idRejetee();
    }

    filtered = computed(() => {
        let list = this.demandes().filter(d => d.statutDemandeId === this.idPourTab(this.statutTab()));
        const s = this.searchText().toLowerCase();
        if (s) list = list.filter(d =>
            d.sujet.toLowerCase().includes(s) ||
            (d.utilisateurNom ?? '').toLowerCase().includes(s) ||
            this.getTypeName(d.typeDemandeId).toLowerCase().includes(s));
        if (this.filterTypeId()) list = list.filter(d => d.typeDemandeId === this.filterTypeId());
        return list;
    });

    paged      = computed(() => this.filtered().slice((this.currentPage()-1)*this.pageSize, this.currentPage()*this.pageSize));
    totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
    pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i+1));
    activeFiltersCount = computed(() => (this.filterTypeId() ? 1 : 0));
    allPageSelected    = computed(() => { const p = this.paged(); return p.length > 0 && p.every(d => this.selectedIds().has(d.id)); });
    somePageSelected   = computed(() => { const p = this.paged(); return p.some(d => this.selectedIds().has(d.id)) && !this.allPageSelected(); });
    isRejeteSelected   = computed(() => this.statuts().find(s => s.id === this.selectedStatutId())?.code === 'REJETEE');
    isAccepteSelected  = computed(() => this.statuts().find(s => s.id === this.selectedStatutId())?.code === 'ACCEPTEE');

    depasseSolde = computed(() => {
        const d  = this.traitementModal();
        const sc = this.soldeUtilisateur();
        if (!d || !sc || !this.isDemandeCongeType(d) || !d.nbJours) return false;
        return d.nbJours > sc.solde;
    });

    setStatutTab(tab: StatutTab): void {
        this.statutTab.set(tab);
        this.currentPage.set(1);
        this.clearSelection();
    }

    demandesAccepteesAvecDates = computed(() =>
        this.demandes().filter(d => d.statutDemandeId === this.idAcceptee() && d.dateDebut)
    );

    calendarEvents = computed<EventInput[]>(() =>
        this.demandesAccepteesAvecDates().map(d => {
            const couleur = this.getCouleurType(d.typeDemandeId);
            const u = this.getUser(d);
            return {
                id: String(d.id),
                title: `${this.getTypeName(d.typeDemandeId)} — ${d.utilisateurNom ?? '—'}`,
                start: d.dateDebut,
                end: d.dateFin ? this.addOneDay(d.dateFin) : d.dateDebut,
                backgroundColor: couleur,
                borderColor: couleur,
                display: 'block',
                extendedProps: {
                    demande: d,
                    photoUrl: u?.photoUrl ?? null,
                    initiales: this.getUserInitiales(d)
                }
            };
        })
    );

    joursFeriesEvents = computed<EventInput[]>(() =>
        this.joursFeries().map(j => ({
            id: 'ferie-' + j.date,
            title: '🎌 ' + j.localName,
            start: j.date,
            allDay: true,
            display: 'block',
            backgroundColor: '#94a3b8',
            borderColor: '#94a3b8',
            editable: false,
            extendedProps: { estFerie: true }
        }))
    );

    private addOneDay(dateStr: string): string {
        const d = new Date(dateStr);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    }

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
            today: "Aujourd'hui", day: 'Jour', week: 'Semaine', month: 'Mois', year: 'Année'
        },
        events: [...this.calendarEvents(), ...this.joursFeriesEvents()],
        eventDisplay: 'block',
        dayMaxEvents: 3,
        eventDidMount: (info) => {
            info.el.setAttribute('title', info.event.title);
        },
        eventContent: (arg) => {
            if (arg.event.extendedProps['estFerie']) {
                return { html: `<div style="padding:1px 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${arg.event.title}</div>` };
            }
            const photo = arg.event.extendedProps['photoUrl'];
            const initiales = arg.event.extendedProps['initiales'];
            const avatarHtml = photo
                ? `<img src="${photo}" style="width:15px;height:15px;border-radius:50%;object-fit:cover;flex-shrink:0">`
                : `<span style="display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:rgba(255,255,255,.35);color:#fff;font-size:.5rem;font-weight:800;flex-shrink:0">${initiales}</span>`;
            return {
                html: `<div style="display:flex;align-items:center;gap:4px;padding:1px 4px;overflow:hidden">
                          ${avatarHtml}
                          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${arg.event.title}</span>
                       </div>`
            };
        },
        eventClick: (info) => {
            if (info.event.extendedProps['estFerie']) return;
            const d = this.demandes().find(x => x.id === +info.event.id);
            if (d) this.showComment(d, new Event('click'));
        }
    }));

    // ── Helpers ──
    getTypeName(id: number)  { return this.types().find(t => t.id === id)?.libelle ?? '—'; }
    getStatut(id: number)    { return this.statuts().find(s => s.id === id); }
    isEnAttente(d: Demande)  { return this.getStatut(d.statutDemandeId)?.code === 'EN_ATTENTE'; }
    peutTraiter()            { return this.permCtx.canApproveDemande() || this.permCtx.canRejectDemande(); }
    peutSupprimer()          { return this.permCtx.can('DEMANDE_DELETE_ALL'); }

    getStatutBadgeClass(id: number): string {
        const code = this.statuts().find(s => s.id === id)?.code ?? '';
        return code === 'EN_ATTENTE' ? 'dt-badge dt-badge-pending'
             : code === 'ACCEPTEE'  ? 'dt-badge dt-badge-delivered'
             : code === 'REJETEE'   ? 'dt-badge dt-badge-canceled'
             : 'dt-badge dt-badge-default';
    }

    getUser(d: Demande)          { return this.utilisateurs().find(u => u.id === d.utilisateurId); }
    getUserInitiales(d: Demande) {
        const u = this.getUser(d);
        if (u) return `${(u.prenom||'?').charAt(0)}${(u.nom||'').charAt(0)}`.toUpperCase();
        return (d.utilisateurNom ?? 'U').split(' ').slice(0,2).map(n => n.charAt(0)).join('').toUpperCase() || 'U';
    }
    getUserPhoto(d: Demande)  { return this.getUser(d)?.photoUrl || null; }
    getUserEmail(d: Demande)  { return this.getUser(d)?.email || ''; }

    isDemandeCongeType(d: Demande): boolean {
        return !!this.types().find(t => t.id === d.typeDemandeId)?.estConge;
    }

    fmtDate(d?: string): string {
        if (!d) return '—';
        const dt = new Date(d);
        const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
        return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]}, ${dt.getFullYear()}`;
    }

    toggleSelectAll() {
        const p = this.paged();
        const s = new Set(this.selectedIds());
        this.allPageSelected() ? p.forEach(d => s.delete(d.id)) : p.forEach(d => s.add(d.id));
        this.selectedIds.set(s);
    }
    toggleSelect(id: number, e: Event) {
        e.stopPropagation();
        const s = new Set(this.selectedIds());
        s.has(id) ? s.delete(id) : s.add(id);
        this.selectedIds.set(s);
    }
    isSelected(id: number) { return this.selectedIds().has(id); }
    clearSelection()       { this.selectedIds.set(new Set()); }
    toggleFilter()         { this.filterOpen.update(v => !v); }
    resetFilters()         { this.filterTypeId.set(null); this.searchText.set(''); this.currentPage.set(1); }

    deleteDemande(d: Demande): void {
        if (!this.peutSupprimer()) { this.ui.error("Permission requise : DEMANDE_DELETE_ALL"); return; }
        this.ui.confirm({
            title: 'Supprimer la demande',
            message: `Supprimer "${d.sujet}" ?`,
            type: 'danger', confirmLabel: 'Supprimer',
            onConfirm: () => {
                this.demandeService.delete(d.id).subscribe({
                    next: () => { this.ui.success('Demande supprimée.'); this.loadAll(); },
                    error: () => this.ui.error('Erreur lors de la suppression.')
                });
            }
        });
    }

    bulkDelete(): void {
        if (!this.peutSupprimer()) { this.ui.error("Permission requise : DEMANDE_DELETE_ALL"); return; }
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
                    this.loadAll();
                }).catch(() => this.ui.error('Erreur lors de la suppression.'));
            }
        });
    }

    openTraitement(d: Demande) {
        this.traitementModal.set(d);
        this.commentaireRH.set(d.commentaireRH ?? '');
        this.selectedStatutId.set(d.statutDemandeId);
        this.traitError.set(null);
        this.soldeUtilisateur.set(null);

        if (this.isDemandeCongeType(d)) {
            this.congeSvc.getSolde(d.utilisateurId).subscribe({
                next: s => this.soldeUtilisateur.set(s),
                error: () => {}
            });
        }
    }
    closeTraitement() { this.traitementModal.set(null); this.soldeUtilisateur.set(null); }

    choisirStatut(statutId: number): void {
        const statut = this.statuts().find(s => s.id === statutId);
        if (statut?.code === 'ACCEPTEE' && this.depasseSolde()) {
            this.traitError.set('Impossible d\'accepter : le nombre de jours demandé dépasse le solde disponible.');
            return;
        }
        this.traitError.set(null);
        this.selectedStatutId.set(statutId);
    }

    confirmerTraitement(): void {
        const d   = this.traitementModal();
        const sid = this.selectedStatutId();
        if (!d || !sid) { this.traitError.set('Veuillez sélectionner un statut.'); return; }
        if (this.isRejeteSelected() && !this.commentaireRH().trim()) {
            this.traitError.set('Commentaire obligatoire pour un rejet.'); return;
        }
        if (this.isAccepteSelected() && this.depasseSolde()) {
            this.traitError.set('Impossible d\'accepter : le nombre de jours demandé dépasse le solde disponible.');
            return;
        }
        this.traitLoading.set(true);
        const traitePar  = this.keycloak.getKeycloakUserId() ?? '';
        const statutCode = this.statuts().find(s => s.id === sid)?.code ?? '';

        this.demandeService.traiter(d.id, sid, traitePar, this.commentaireRH(), statutCode).subscribe({
            next: () => {
                this.traitementModal.set(null);
                this.soldeUtilisateur.set(null);
                this.ui.success('Demande traitée.');
                this.loadAll();
                this.traitLoading.set(false);
            },
            error: (err: HttpErrorResponse) => {
                this.traitError.set(err.error?.message || 'Erreur.');
                this.traitLoading.set(false);
            }
        });
    }

    showComment(d: Demande, e: Event) { e.stopPropagation(); this.commentPopup.set(d.commentaireRH ?? null); }
    closeComment()    { this.commentPopup.set(null); }
    goPage(p: number) { this.currentPage.set(Math.max(1, Math.min(p, this.totalPages()))); }
    minVal(a: number, b: number) { return Math.min(a, b); }
    exportCsv(): void {
        if (!this.permCtx.canExportDemandes()) { this.ui.error("Permission requise : DEMANDE_EXPORT"); return; }
        this.demandeService.exportCsv();
    }

    startEditTaux(): void { this.editingTaux.set(true); this.tauxTemp.set(this.tauxActuel()); }
    cancelEditTaux(): void { this.editingTaux.set(false); }
    saveTaux(): void {
        this.congeSvc.updateTaux(this.tauxTemp()).subscribe({
            next: t => { this.tauxActuel.set(t.tauxMensuel); this.editingTaux.set(false); this.ui.success('Taux mis à jour ✅'); },
            error: () => this.ui.error('Erreur lors de la mise à jour du taux.')
        });
    }
}