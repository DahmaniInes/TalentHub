// admin-demandes.component.ts — REMPLACE complet
import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
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

@Component({
    selector: 'app-admin-demandes',
    standalone: true,
    imports: [CommonModule, FormsModule],
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
    readonly permCtx       = inject(PermissionContextService);

    demandes     = signal<Demande[]>([]);
    types        = signal<TypeDemande[]>([]);
    statuts      = signal<StatutDemande[]>([]);
    utilisateurs = signal<Utilisateur[]>([]);
    loading      = signal(false);

    filterOpen     = signal(false);
    searchText     = signal('');
    filterStatutId = signal<number | null>(null);
    filterTypeId   = signal<number | null>(null);
    selectedIds    = signal<Set<number>>(new Set());

    traitementModal  = signal<Demande | null>(null);
    commentaireRH    = signal('');
    selectedStatutId = signal<number | null>(null);
    traitLoading     = signal(false);
    traitError       = signal<string | null>(null);
    commentPopup     = signal<string | null>(null);

    // ✅ NOUVEAU — solde de congé du demandeur, affiché dans la modale de
    // traitement uniquement si le type de la demande est marqué "congé".
    soldeUtilisateur = signal<SoldeConge | null>(null);

    // ✅ NOUVEAU — configuration du taux mensuel de congé (admin)
    tauxActuel  = signal<number>(1.8);
    editingTaux = signal(false);
    tauxTemp    = signal(1.8);

    pageSize    = 10;
    currentPage = signal(1);

    private subs = new Subscription();

    ngOnInit(): void {
        this.nomenclature.getAllTypes().subscribe({ next: t => this.types.set(t), error: () => {} });
        this.nomenclature.getAllStatuts().subscribe({ next: s => this.statuts.set(s), error: () => {} });
        this.userService.getAllUsers().subscribe({ next: u => this.utilisateurs.set(u), error: () => {} });
        this.congeSvc.getTauxActuel().subscribe({
            next: t => { this.tauxActuel.set(t.tauxMensuel); this.tauxTemp.set(t.tauxMensuel); },
            error: () => {}
        });
        this.loadAll();

        // ✅ Écouter le flux SSE — recharger dès qu'une nouvelle notification arrive
        this.subs.add(
            this.notifService.newNotification$.subscribe(notif => {
                // Toute notification liée aux demandes → recharger la liste
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

    // ── Computed ──
    idEnAttente    = computed(() => this.statuts().find(s => s.code === 'EN_ATTENTE')?.id ?? -1);
    idAcceptee     = computed(() => this.statuts().find(s => s.code === 'ACCEPTEE')?.id  ?? -1);
    idRejetee      = computed(() => this.statuts().find(s => s.code === 'REJETEE')?.id   ?? -1);
    countEnAttente = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idEnAttente()).length);
    countAcceptee  = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idAcceptee()).length);
    countRejetee   = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idRejetee()).length);

    filtered = computed(() => {
        let list = this.demandes();
        const s = this.searchText().toLowerCase();
        if (s) list = list.filter(d =>
            d.sujet.toLowerCase().includes(s) ||
            (d.utilisateurNom ?? '').toLowerCase().includes(s) ||
            this.getTypeName(d.typeDemandeId).toLowerCase().includes(s));
        if (this.filterStatutId()) list = list.filter(d => d.statutDemandeId === this.filterStatutId());
        if (this.filterTypeId())   list = list.filter(d => d.typeDemandeId === this.filterTypeId());
        return list;
    });

    paged      = computed(() => this.filtered().slice((this.currentPage()-1)*this.pageSize, this.currentPage()*this.pageSize));
    totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
    pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i+1));
    activeFiltersCount = computed(() => (this.filterStatutId() ? 1 : 0) + (this.filterTypeId() ? 1 : 0));
    allPageSelected    = computed(() => { const p = this.paged(); return p.length > 0 && p.every(d => this.selectedIds().has(d.id)); });
    somePageSelected   = computed(() => { const p = this.paged(); return p.some(d => this.selectedIds().has(d.id)) && !this.allPageSelected(); });
    isRejeteSelected   = computed(() => this.statuts().find(s => s.id === this.selectedStatutId())?.code === 'REJETEE');

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

    /** ✅ NOUVEAU — le type de la demande courante est-il marqué "congé" ? */
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
    resetFilters()         { this.filterStatutId.set(null); this.filterTypeId.set(null); this.searchText.set(''); this.currentPage.set(1); }

    // ✅ Suppression d'une seule demande
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

    // ✅ Suppression en groupe
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

        // ✅ Si le type de la demande est marqué "congé", charger le solde du demandeur
        if (this.isDemandeCongeType(d)) {
            this.congeSvc.getSolde(d.utilisateurId).subscribe({
                next: s => this.soldeUtilisateur.set(s),
                error: () => {}
            });
        }
    }
    closeTraitement() { this.traitementModal.set(null); this.soldeUtilisateur.set(null); }

    confirmerTraitement(): void {
        const d   = this.traitementModal();
        const sid = this.selectedStatutId();
        if (!d || !sid) { this.traitError.set('Veuillez sélectionner un statut.'); return; }
        if (this.isRejeteSelected() && !this.commentaireRH().trim()) {
            this.traitError.set('Commentaire obligatoire pour un rejet.'); return;
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

    // ✅ NOUVEAU — configuration du taux mensuel de congé
    startEditTaux(): void { this.editingTaux.set(true); this.tauxTemp.set(this.tauxActuel()); }
    cancelEditTaux(): void { this.editingTaux.set(false); }
    saveTaux(): void {
        this.congeSvc.updateTaux(this.tauxTemp()).subscribe({
            next: t => { this.tauxActuel.set(t.tauxMensuel); this.editingTaux.set(false); this.ui.success('Taux mis à jour ✅'); },
            error: () => this.ui.error('Erreur lors de la mise à jour du taux.')
        });
    }
}