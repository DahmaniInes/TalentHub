// activites-global.component.ts — COMPLET — priorite → prioriteId
import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ActiviteService }          from '../../../services/activite.service';
import { StatutActiviteService }    from '../../../services/statutactivite.service';
import { UserService }              from '../../../services/user.service';
import { UiService }                from '../../../services/ui.service';
import { ErrorService }             from '../../../services/error.service';
import { GroupeService }            from '../../../services/groupe.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { NotificationService }      from '../../../services/notification.service';
// ← AJOUT
import { PrioriteActiviteService }  from '../../../services/priorite-activite.service';
import { PrioriteActivite }         from '../../../shared/models/priorite-activite.model';

import { Activite, ActiviteRequest } from '../../../shared/models/activite.model';
import { StatutActivite }            from '../../../shared/models/statut-activite.model';
import { Utilisateur }               from '../../../shared/models/utilisateur.model';
import { Groupe }                    from '../../../shared/models/groupe.model';
import { HttpErrorResponse }         from '@angular/common/http';

type FiltreVue = 'toutes' | 'globales' | 'projets';

@Component({
  selector: 'app-activites-global',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activites-global-component.component.html',
  styleUrls: ['./activites-global-component.component.css']
})
export class ActivitesGlobalComponent implements OnInit, OnDestroy {

  private activiteSvc   = inject(ActiviteService);
  private nomencSvc     = inject(StatutActiviteService);
  private userSvc       = inject(UserService);
  private groupeSvc     = inject(GroupeService);
  private errorSvc      = inject(ErrorService);
  private router        = inject(Router);
  // ← AJOUT
  private prioriteSvc   = inject(PrioriteActiviteService);
  readonly ui           = inject(UiService);
  readonly Math         = Math;
  readonly perms        = inject(PermissionContextService);
  private notifSvc      = inject(NotificationService);
  private subs          = new Subscription();

  // ── Données ──
  activites       = signal<Activite[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);
  utilisateurs    = signal<Utilisateur[]>([]);
  tousGroupes     = signal<Groupe[]>([]);
  // ← AJOUT : signal dynamique (remplace PRIORITES statique)
  priorites       = signal<PrioriteActivite[]>([]);

  // ── UI ──
  loading         = signal(false);
  showModal       = signal(false);
  editingActivite = signal<Activite | null>(null);
  filterPanelOpen = signal(false);

  // ── Filtres ──
  search         = signal('');
  filterVue      = signal<FiltreVue>('toutes');
  filterStatut   = signal<number | ''>('');
  // ← MODIFIÉ : filtre par prioriteId (number = id en base)
  filterPriorite = signal<number | ''>('');

  // ── Pagination ──
  pageSize    = signal(15);
  currentPage = signal(1);

  // ── Sélection ──
  selectedIds = signal<Set<number>>(new Set());
  openMenuId  = signal<number | null>(null);

  // ── Formulaire activité ──
  form = signal<ActiviteRequest>({
    nom: '', description: '', couleur: '#10b981',
    statutActiviteId: 1, typeBudget: 'ILLIMITE',
    visible: true, facturable: true,
    prioriteId: undefined,   // ← était priorite: 2
    estGlobale: false
  });
  formGroupeIds = signal<number[]>([]);

  // ── Constantes ──
  readonly COULEURS = [
    '#6366f1','#8b5cf6','#c026d3','#ec4899','#ef4444',
    '#f97316','#eab308','#22c55e','#10b981','#06b6d4','#3b82f6','#64748b'
  ];

  // ← SUPPRIMÉ : readonly PRIORITES = [...] — remplacé par priorites signal

  private readonly STATUT_CODE_MAP: Record<string, string> = {
    'A_FAIRE':  'dt-status-a-faire',
    'EN_COURS': 'dt-status-en-cours',
    'EN_REVUE': 'dt-status-en-revue',
    'TERMINE':  'dt-status-termine',
    'BLOQUE':   'dt-status-bloque',
    'ANNULE':   'dt-status-annule',
  };

  // ── Computed ──
  filteredActivites = computed(() => {
    let list = this.activites();
    const q  = this.search().toLowerCase();
    if (this.filterVue() === 'globales') list = list.filter(a => a.estGlobale);
    if (this.filterVue() === 'projets')  list = list.filter(a => a.projets && a.projets.length > 0);
    if (this.filterStatut())   list = list.filter(a => a.statutActiviteId === +this.filterStatut());
    // ← MODIFIÉ : filtre sur prioriteId
    if (this.filterPriorite()) list = list.filter(a => a.prioriteId === +this.filterPriorite());
    if (q) list = list.filter(a =>
      a.nom.toLowerCase().includes(q) ||
      (a.utilisateurNomComplet || '').toLowerCase().includes(q) ||
      (a.numeroActivite || '').toLowerCase().includes(q) ||
      (a.projets || []).some(p => p.nom.toLowerCase().includes(q))
    );
    return list;
  });

  totalPages     = computed(() => Math.max(1, Math.ceil(this.filteredActivites().length / this.pageSize())));
  pagesArray     = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedActivites = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredActivites().slice(start, start + this.pageSize());
  });

  allPageSelected  = computed(() => { const p = this.pagedActivites(); return p.length > 0 && p.every(a => this.selectedIds().has(a.id)); });
  somePageSelected = computed(() => { const p = this.pagedActivites(); return p.some(a => this.selectedIds().has(a.id)) && !this.allPageSelected(); });
  selectedCount    = computed(() => this.selectedIds().size);

  statsToutes   = computed(() => this.activites().length);
  statsGlobales = computed(() => this.activites().filter(a => a.estGlobale).length);
  statsProjets  = computed(() => this.activites().filter(a => a.projets && a.projets.length > 0).length);

  activeFiltersCount = computed(() =>
    [this.filterStatut() ? '1' : '', this.filterPriorite() ? '1' : '',
     this.filterVue() !== 'toutes' ? '1' : '', this.search()]
      .filter(v => !!v).length
  );

  groupesDispoActivite = computed(() => {
    const sel = new Set(this.formGroupeIds());
    return this.tousGroupes().filter(g => !sel.has(g.id));
  });

  // ── Lifecycle ──
  ngOnInit(): void {
    if (!this.perms.canSeeAnyActivity()) {
      this.loading.set(false);
      return;
    }
    this.loadAll();

    // Temps réel
    this.subs.add(this.notifSvc.newNotification$.subscribe(n => {
      const t = String(n.type);
      if (t === 'ACTIVITE_COMMENTAIRE' || t === 'ACTIVITE_STATUT_CHANGE' || t === 'ACTIVITE_ASSIGNEE') {
        this.loadAll();
      }
    }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  loadAll(): void {
    this.loading.set(true);
    this.activiteSvc.getAll().subscribe({
      next: d => { this.activites.set(d); this.loading.set(false); },
      error: () => { this.ui.error('Erreur chargement activités.'); this.loading.set(false); }
    });
    this.nomencSvc.getStatutsActivite().subscribe({ next: d => this.statutsActivite.set(d) });
    this.userSvc.getAllUsers().subscribe({ next: d => this.utilisateurs.set(d) });
    this.groupeSvc.getAll().subscribe({ next: g => this.tousGroupes.set(g), error: () => this.tousGroupes.set([]) });
    // ← AJOUT : charger les priorités depuis la nomenclature
    this.prioriteSvc.getActives().subscribe({ next: p => this.priorites.set(p) });
  }

  // ── Navigation ──
  openDetail(a: Activite): void { this.router.navigate(['/activites', a.id]); }

  // ── Filtres ──
  closeFilterPanel(): void { this.filterPanelOpen.set(false); this.openMenuId.set(null); }
  resetFilters(): void {
    this.filterStatut.set(''); this.filterPriorite.set('');
    this.filterVue.set('toutes'); this.search.set(''); this.currentPage.set(1);
  }

  // ── Modal ──
  openAdd(): void {
    if (!this.perms.canCreateActivity()) { this.ui.warning('Permission ACTIVITY_CREATE requise.'); return; }
    this.editingActivite.set(null);
    const s    = this.statutsActivite()[0];
    const norm = this.priorites().find(p => p.code === 'NORMALE');
    this.form.set({
      nom: '', description: '', couleur: '#10b981',
      statutActiviteId: s?.id || 1, typeBudget: 'ILLIMITE',
      visible: true, facturable: true,
      prioriteId: norm?.id || undefined,   // ← MODIFIÉ
      estGlobale: false
    });
    this.formGroupeIds.set([]);
    this.showModal.set(true);
  }

  openEdit(a: Activite, e?: Event): void {
    if (e) e.stopPropagation();
    if (!this.perms.canEditAnyActivity()) { this.ui.warning('Permission de modification requise.'); return; }
    this.editingActivite.set(a);
    this.form.set({
      nom: a.nom, description: a.description || '',
      couleur: a.couleur || '#10b981',
      statutActiviteId: a.statutActiviteId,
      budget: a.budget, quotaHoraire: a.quotaHoraire,
      typeBudget: a.typeBudget || 'ILLIMITE',
      visible: a.visible, facturable: a.facturable,
      estGlobale: a.estGlobale || false,
      prioriteId: a.prioriteId || undefined,  // ← MODIFIÉ : était priorite: a.priorite
      dateEcheance: a.dateEcheance,
      heuresEstimees: a.heuresEstimees,
      utilisateurId: a.utilisateurId
    });
    this.formGroupeIds.set((a.groupes || []).map(g => g.id));
    this.showModal.set(true);
    this.openMenuId.set(null);
  }

  closeModal(): void { this.showModal.set(false); this.editingActivite.set(null); }

  save(): void {
    const f = { ...this.form(), groupeIds: this.formGroupeIds() };
    if (!f.nom?.trim()) { this.ui.warning('Le nom est obligatoire.'); return; }
    const editing = this.editingActivite();
    const obs = editing ? this.activiteSvc.update(editing.id, f) : this.activiteSvc.create(f);
    obs.subscribe({
      next: () => { this.ui.success(editing ? 'Activité mise à jour.' : 'Activité créée.'); this.closeModal(); this.loadAll(); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  // ── Groupes formulaire ──
  getGroupeNom(id: number): string { return this.tousGroupes().find(g => g.id === id)?.nom || `Groupe #${id}`; }
  addGroupeToActiviteForm(groupeId: number): void {
    if (!groupeId) return;
    const cur = this.formGroupeIds();
    if (!cur.includes(groupeId)) this.formGroupeIds.set([...cur, groupeId]);
  }
  removeGroupeFromActiviteForm(groupeId: number): void {
    this.formGroupeIds.update(ids => ids.filter(id => id !== groupeId));
  }

  // ── Suppression ──
  delete(a: Activite, e?: Event): void {
    if (e) e.stopPropagation();
    if (!this.perms.canDeleteAllActivities()) { this.ui.warning('Permission ACTIVITY_DELETE_ALL requise.'); return; }
    this.ui.confirm({
      title: 'Supprimer l\'activité', message: `Supprimer "${a.nom}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        this.activiteSvc.delete(a.id).subscribe({
          next: () => { this.ui.success('Activité supprimée.'); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
    this.openMenuId.set(null);
  }

  deleteBulk(): void {
    if (!this.perms.canDeleteAllActivities()) { this.ui.warning('Permission ACTIVITY_DELETE_ALL requise.'); return; }
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    this.ui.confirm({
      title: `Supprimer ${ids.length} activité(s)`, message: 'Supprimer définitivement ?',
      confirmLabel: 'Tout supprimer', type: 'danger',
      onConfirm: () => {
        this.activiteSvc.deleteBulk(ids).subscribe({
          next: () => { this.ui.success(`${ids.length} activité(s) supprimée(s).`); this.clearSelection(); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  changerStatut(a: Activite, statutId: number): void {
    this.activiteSvc.changerStatut(a.id, statutId).subscribe({
      next: () => { this.loadAll(); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  // ── Sélection ──
  toggleSelectAll(): void {
    const p = this.pagedActivites();
    const s = new Set(this.selectedIds());
    this.allPageSelected() ? p.forEach(a => s.delete(a.id)) : p.forEach(a => s.add(a.id));
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

  // ── Pagination ──
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages()) this.currentPage.set(p); }
  onPageSizeChange(s: number): void { this.pageSize.set(s); this.currentPage.set(1); }
  resetPage(): void { this.currentPage.set(1); }
  minVal(a: number, b: number): number { return Math.min(a, b); }

  // ── Helpers affichage ──

  // ← MODIFIÉ : cherche dans le signal dynamique au lieu de PRIORITES statique
  getPrioriteCouleur(prioriteId?: number): string {
    if (!prioriteId) return '#3b82f6';
    return this.priorites().find(p => p.id === prioriteId)?.couleur || '#3b82f6';
  }

  // ← MODIFIÉ : cherche par id (pas value)
  getPrioriteLabel(prioriteId?: number): string {
    if (!prioriteId) return 'Normale';
    return this.priorites().find(p => p.id === prioriteId)?.libelle || 'Normale';
  }

  getStatutLibelle(id?: number): string {
    if (!id) return '—';
    return this.statutsActivite().find(s => s.id === id)?.libelle || '—';
  }

  getStatutBadgeClass(id?: number): string {
    if (!id) return 'dt-badge dt-badge-default';
    const statut = this.statutsActivite().find(s => s.id === id);
    if (!statut) return 'dt-badge dt-badge-default';
    if (statut.code && this.STATUT_CODE_MAP[statut.code]) return `dt-badge ${this.STATUT_CODE_MAP[statut.code]}`;
    const lib = (statut.libelle || '').toLowerCase();
    if (lib.includes('faire'))  return 'dt-badge dt-status-a-faire';
    if (lib.includes('cours'))  return 'dt-badge dt-status-en-cours';
    if (lib.includes('revue'))  return 'dt-badge dt-status-en-revue';
    if (lib.includes('termin')) return 'dt-badge dt-status-termine';
    if (lib.includes('bloqu'))  return 'dt-badge dt-status-bloque';
    if (lib.includes('annul'))  return 'dt-badge dt-status-annule';
    return 'dt-badge dt-badge-default';
  }

  getProgressCouleur(passees?: number, estimees?: number): string {
    if (!estimees || estimees === 0) return '#94a3b8';
    const pct = ((passees || 0) / estimees) * 100;
    if (pct >= 100) return '#ef4444';
    if (pct >= 80)  return '#f59e0b';
    return '#10b981';
  }

  getProgressPct(passees?: number, estimees?: number): number {
    if (!estimees || estimees === 0) return 0;
    return Math.min(100, Math.round(((passees || 0) / estimees) * 100));
  }

  getAvatarColor(name: string): string {
    const colors = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6'];
    return colors[(name || '').charCodeAt(0) % colors.length];
  }

  getInitiales(nom: string): string {
    return (nom || '').split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  }

  fmtDate(d?: string | Date): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '—';
    const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(date.getDate()).padStart(2,'0')} ${MOIS[date.getMonth()]}, ${date.getFullYear()}`;
  }

  fmtHeures(h: number): string {
    if (!h || h <= 0) return '0h';
    const heures  = Math.floor(h);
    const minutes = Math.round((h - heures) * 60);
    return minutes > 0 ? `${heures}h${String(minutes).padStart(2,'0')}` : `${heures}h`;
  }
}