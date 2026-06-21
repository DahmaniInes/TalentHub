// activites-global.component.ts — COMPLET
// ✅ Liste limitée aux activités globales (estGlobale === true)
// ✅ Création/édition toujours estGlobale = true, formulaire réduit à
//    Nom, Description, Priorité, Couleur, Visibilité
// ✅ Page détail remplacée par un drawer latéral (avec commentaires)
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
import { PrioriteActiviteService }  from '../../../services/priorite-activite.service';
import { PrioriteActivite }         from '../../../shared/models/priorite-activite.model';
import { CommentaireService }       from '../../../services/commentaire.service';
import { KeycloakService }          from '../../../services/keycloak.service';

import { Activite, ActiviteRequest } from '../../../shared/models/activite.model';
import { StatutActivite }            from '../../../shared/models/statut-activite.model';
import { Utilisateur }               from '../../../shared/models/utilisateur.model';
import { Groupe }                    from '../../../shared/models/groupe.model';
import { Commentaire }               from '../../../shared/models/commentaire.model';
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
  private prioriteSvc   = inject(PrioriteActiviteService);
  readonly ui           = inject(UiService);
  readonly Math         = Math;
  readonly perms        = inject(PermissionContextService);
  private notifSvc      = inject(NotificationService);
  private commentSvc    = inject(CommentaireService);
  private keycloak      = inject(KeycloakService);
  private subs          = new Subscription();

  // ── Données ──
  activites       = signal<Activite[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);
  utilisateurs    = signal<Utilisateur[]>([]);
  tousGroupes     = signal<Groupe[]>([]);
  priorites       = signal<PrioriteActivite[]>([]);

  // ── UI ──
  loading         = signal(false);
  showModal       = signal(false);
  editingActivite = signal<Activite | null>(null);
  filterPanelOpen = signal(false);

  // ── Drawer détail (remplace l'ancienne page /activites/:id) ──
  detailDrawerOpen = signal(false);
  selectedActivite = signal<Activite | null>(null);
  drawerCommentaires    = signal<Commentaire[]>([]);
  loadingDrawerComments = signal(false);
  nouveauCommentaire    = signal('');
  submittingComment     = signal(false);
  editingCommentId       = signal<number | null>(null);
  editContenu            = signal('');
  currentUserKcId = '';
  currentUserNom  = '';

  // ── Filtres ──
  search         = signal('');
  filterVue      = signal<FiltreVue>('toutes');
  filterStatut   = signal<number | ''>('');
  filterPriorite = signal<number | ''>('');

  // ── Pagination ──
  pageSize    = signal(15);
  currentPage = signal(1);

  // ── Sélection ──
  selectedIds = signal<Set<number>>(new Set());
  openMenuId  = signal<number | null>(null);

  // ── Formulaire activité (réduit : Nom, Description, Priorité, Couleur, Visible) ──
  // ✅ estGlobale est toujours forcé à true, jamais exposé dans le formulaire
  form = signal<ActiviteRequest>({
    nom: '', description: '', couleur: '#10b981',
    visible: true,
    prioriteId: undefined,
    estGlobale: true
  });

  // ── Constantes ──
  readonly COULEURS = [
    '#6366f1','#8b5cf6','#c026d3','#ec4899','#ef4444',
    '#f97316','#eab308','#22c55e','#10b981','#06b6d4','#3b82f6','#64748b'
  ];

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
    // ✅ Toujours limité aux activités globales — cette page n'affiche que ça
    let list = this.activites().filter(a => a.estGlobale);
    const q  = this.search().toLowerCase();
    if (this.filterStatut())   list = list.filter(a => a.statutActiviteId === +this.filterStatut());
    if (this.filterPriorite()) list = list.filter(a => a.prioriteId === +this.filterPriorite());
    if (q) list = list.filter(a =>
      a.nom.toLowerCase().includes(q) ||
      (a.utilisateurNomComplet || '').toLowerCase().includes(q) ||
      (a.numeroActivite || '').toLowerCase().includes(q)
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

  // ✅ Les stats portent désormais uniquement sur les activités globales déjà filtrées
  statsToutes   = computed(() => this.filteredActivites().length);
  statsGlobales = computed(() => this.filteredActivites().length);
  statsProjets  = computed(() => this.filteredActivites().filter(a => a.projets && a.projets.length > 0).length);

  activeFiltersCount = computed(() =>
    [this.filterStatut() ? '1' : '', this.filterPriorite() ? '1' : '', this.search()]
      .filter(v => !!v).length
  );

  // ── Lifecycle ──
  ngOnInit(): void {
    if (!this.perms.canSeeAnyActivity()) {
      this.loading.set(false);
      return;
    }
    this.currentUserKcId = this.keycloak.getKeycloakUserId() || '';
    this.currentUserNom  = this.keycloak.getFullName() || '';

    this.loadAll();

    // Temps réel
    this.subs.add(this.notifSvc.newNotification$.subscribe(n => {
      const t = String(n.type);
      if (t === 'ACTIVITE_COMMENTAIRE' || t === 'ACTIVITE_STATUT_CHANGE' || t === 'ACTIVITE_ASSIGNEE') {
        this.loadAll();
        const sel = this.selectedActivite();
        if (sel && t === 'ACTIVITE_COMMENTAIRE' && n.ressourceId === sel.id) {
          this.loadDrawerCommentaires(sel.id);
        }
      }
    }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  loadAll(): void {
    this.loading.set(true);
    // ✅ On charge uniquement les activités globales directement depuis le backend
    this.activiteSvc.getGlobales().subscribe({
      next: d => { this.activites.set(d); this.loading.set(false); },
      error: () => { this.ui.error('Erreur chargement activités.'); this.loading.set(false); }
    });
    this.nomencSvc.getStatutsActivite().subscribe({ next: d => this.statutsActivite.set(d) });
    this.userSvc.getAllUsers().subscribe({ next: d => this.utilisateurs.set(d) });
    this.groupeSvc.getAll().subscribe({ next: g => this.tousGroupes.set(g), error: () => this.tousGroupes.set([]) });
    this.prioriteSvc.getActives().subscribe({ next: p => this.priorites.set(p) });
  }

  // ── Drawer détail (remplace l'ancienne navigation vers /activites/:id) ──
  openDetail(a: Activite): void {
    this.selectedActivite.set(a);
    this.nouveauCommentaire.set('');
    this.detailDrawerOpen.set(true);
    this.loadDrawerCommentaires(a.id);
  }

  closeDetailDrawer(): void {
    this.detailDrawerOpen.set(false);
    this.selectedActivite.set(null);
    this.drawerCommentaires.set([]);
  }

  loadDrawerCommentaires(activiteId: number): void {
    this.loadingDrawerComments.set(true);
    this.commentSvc.getByActivite(activiteId).subscribe({
      next: c => { this.drawerCommentaires.set(c); this.loadingDrawerComments.set(false); },
      error: () => this.loadingDrawerComments.set(false)
    });
  }

  submitDrawerComment(): void {
    const a = this.selectedActivite();
    if (!a) return;
    const contenu = this.nouveauCommentaire().trim();
    if (!contenu) return;
    this.submittingComment.set(true);
    this.commentSvc.createForActivite(a.id, { contenu, auteurNom: this.currentUserNom }).subscribe({
      next: c => {
        this.drawerCommentaires.update(l => [c, ...l]);
        this.nouveauCommentaire.set('');
        this.submittingComment.set(false);
        this.activites.update(l => l.map(x => x.id === a.id ? { ...x, nombreCommentaires: (x.nombreCommentaires || 0) + 1 } : x));
      },
      error: () => { this.submittingComment.set(false); this.ui.error('Erreur.'); }
    });
  }

  startEditDrawerComment(c: Commentaire): void { this.editingCommentId.set(c.id); this.editContenu.set(c.contenu); }
  cancelEditDrawerComment(): void { this.editingCommentId.set(null); }
  saveEditDrawerComment(c: Commentaire): void {
    const contenu = this.editContenu().trim();
    if (!contenu) return;
    this.commentSvc.update(c.id, contenu).subscribe({
      next: u => { this.drawerCommentaires.update(l => l.map(x => x.id === c.id ? u : x)); this.editingCommentId.set(null); }
    });
  }
  deleteDrawerComment(c: Commentaire): void {
    const a = this.selectedActivite();
    this.ui.confirm({
      title: 'Supprimer', message: 'Supprimer ce commentaire ?', type: 'danger', confirmLabel: 'Supprimer',
      onConfirm: () => this.commentSvc.delete(c.id).subscribe({
        next: () => {
          this.drawerCommentaires.update(l => l.filter(x => x.id !== c.id));
          if (a) this.activites.update(l => l.map(x => x.id === a.id ? { ...x, nombreCommentaires: Math.max(0, (x.nombreCommentaires || 1) - 1) } : x));
        }
      })
    });
  }
  isOwnDrawerComment(c: Commentaire): boolean { return c.auteurKeycloakId === this.currentUserKcId; }

  openEditFromDrawer(): void {
    const a = this.selectedActivite();
    if (!a) return;
    this.closeDetailDrawer();
    setTimeout(() => this.openEdit(a), 150);
  }

  // ── Filtres ──
  closeFilterPanel(): void { this.filterPanelOpen.set(false); this.openMenuId.set(null); }
  resetFilters(): void {
    this.filterStatut.set(''); this.filterPriorite.set('');
    this.search.set(''); this.currentPage.set(1);
  }

  // ── Modal — formulaire réduit : Nom, Description, Priorité, Couleur, Visible ──
  openAdd(): void {
    if (!this.perms.canCreateActivity()) { this.ui.warning('Permission ACTIVITY_CREATE requise.'); return; }
    this.editingActivite.set(null);
    const norm = this.priorites().find(p => p.code === 'NORMALE');
    this.form.set({
      nom: '', description: '', couleur: '#10b981',
      visible: true,
      prioriteId: norm?.id || undefined,
      // ✅ Toujours globale, non modifiable par l'utilisateur dans ce composant
      estGlobale: true
    });
    this.showModal.set(true);
  }

  openEdit(a: Activite, e?: Event): void {
    if (e) e.stopPropagation();
    if (!this.perms.canEditAnyActivity()) { this.ui.warning('Permission de modification requise.'); return; }
    this.editingActivite.set(a);
    this.form.set({
      nom: a.nom, description: a.description || '',
      couleur: a.couleur || '#10b981',
      visible: a.visible,
      prioriteId: a.prioriteId || undefined,
      // ✅ Reste globale même en édition
      estGlobale: true
    });
    this.showModal.set(true);
    this.openMenuId.set(null);
  }

  closeModal(): void { this.showModal.set(false); this.editingActivite.set(null); }

  save(): void {
    // ✅ On repart toujours du formulaire réduit et on force estGlobale = true,
    // sans jamais envoyer statutActiviteId/groupeIds/dates/budget depuis cette page.
    const f: ActiviteRequest = {
      nom: this.form().nom,
      description: this.form().description,
      couleur: this.form().couleur,
      visible: this.form().visible,
      prioriteId: this.form().prioriteId,
      estGlobale: true
    };
    if (!f.nom?.trim()) { this.ui.warning('Le nom est obligatoire.'); return; }
    const editing = this.editingActivite();
    const obs = editing ? this.activiteSvc.update(editing.id, f) : this.activiteSvc.create(f);
    obs.subscribe({
      next: () => { this.ui.success(editing ? 'Activité mise à jour.' : 'Activité créée.'); this.closeModal(); this.loadAll(); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
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

  getPrioriteCouleur(prioriteId?: number): string {
    if (!prioriteId) return '#3b82f6';
    return this.priorites().find(p => p.id === prioriteId)?.couleur || '#3b82f6';
  }

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

  getStatutCouleur(id?: number): string {
    if (!id) return '#94a3b8';
    return this.statutsActivite().find(s => s.id === id)?.couleur || '#94a3b8';
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

  fmtDateTime(d?: string | Date): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '—';
    const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(date.getDate()).padStart(2,'0')} ${MOIS[date.getMonth()]} ${date.getFullYear()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  }

  fmtHeures(h: number): string {
    if (!h || h <= 0) return '0h';
    const heures  = Math.floor(h);
    const minutes = Math.round((h - heures) * 60);
    return minutes > 0 ? `${heures}h${String(minutes).padStart(2,'0')}` : `${heures}h`;
  }
}