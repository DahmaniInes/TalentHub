import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProjetService }            from '../../../services/projet.service';
import { ClientService }            from '../../../services/client.service';
import { ActiviteService }          from '../../../services/activite.service';
import { GroupeService, GroupeRequest } from '../../../services/groupe.service';
import { UserService }              from '../../../services/user.service';
import { UiService }                from '../../../services/ui.service';
import { ErrorService }             from '../../../services/error.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { NotificationService }      from '../../../services/notification.service';
import { StatutActiviteService }    from '../../../services/statutactivite.service';

import { Projet, ProjetRequest, StatutProjet, TypeProjet } from '../../../shared/models/projet.model';
import { Client }         from '../../../shared/models/client.model';
import { Activite }       from '../../../shared/models/activite.model';
import { Groupe }         from '../../../shared/models/groupe.model';
import { StatutActivite } from '../../../shared/models/statut-activite.model';
import { HttpErrorResponse } from '@angular/common/http';

// ✅ NOUVEAU — ID nomenclature du type de projet "STAGE_ACADEMIQUE" (confirmé
// en base, déjà utilisé comme constante dans ProjetStageService côté Angular).
// Cette page (Projets d'entreprise) ne doit JAMAIS afficher les projets de
// stage, qui ont leur propre page dédiée (/projets-stage).
const TYPE_PROJET_STAGE_ID = 4;

@Component({
  selector: 'app-projets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projets.component.html',
  styleUrls: ['./projets.component.css']
})
export class ProjetsComponent implements OnInit, OnDestroy {

  private projetSvc   = inject(ProjetService);
  private clientSvc   = inject(ClientService);
  private activiteSvc = inject(ActiviteService);
  private nomencSvc   = inject(StatutActiviteService);
  private groupeSvc   = inject(GroupeService);
  private errorSvc    = inject(ErrorService);
  private router      = inject(Router);
  readonly ui         = inject(UiService);
  readonly Math       = Math;
  readonly perms      = inject(PermissionContextService);
  private notifSvc    = inject(NotificationService);
  private subs        = new Subscription();

  // ── Données ──
  projets         = signal<Projet[]>([]);
  clients         = signal<Client[]>([]);
  tousGroupes     = signal<Groupe[]>([]);
  toutesActivites = signal<Activite[]>([]);
  statutsProjet   = signal<StatutProjet[]>([]);
  typesProjet     = signal<TypeProjet[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);

  // ── UI ──
  loading          = signal(true);
  filterPanelOpenP = signal(false);

  // ── Filtres ──
  filterStatutId = signal<number | ''>('');
  filterClient   = signal<number | ''>('');
  search         = signal('');

  // ── Tableau ──
  selectedIds = signal<Set<number>>(new Set());
  pageSize    = signal(10);
  currentPage = signal(1);
  openMenuId  = signal<number | null>(null);

  // ── Modal ──
  showProjetModal = signal(false);
  editingProjet   = signal<Projet | null>(null);

  // ── Formulaire projet ──
  projetForm = signal<ProjetRequest>({
    nom: '', description: '', couleur: '#6366f1',
    statutProjetId: undefined, typeProjetId: undefined,
    typeBudget: 'ILLIMITE', visible: true, facturable: true,
    autoriserActivitesGlobales: false,
    heuresEstimees: undefined, seuilAlerteHoraire: 80,
    groupeIds: [], activiteIds: []
  });
  projetFormClientId     = signal<number | null>(null);
  groupesSelectionnes    = signal<number[]>([]);
  activitesSelectionnees = signal<number[]>([]);

  // ── Constantes ──
  readonly COULEURS = [
    '#6366f1','#8b5cf6','#c026d3','#ec4899','#ef4444',
    '#f97316','#eab308','#22c55e','#10b981','#06b6d4','#3b82f6','#64748b'
  ];
  readonly TYPES_BUDGET = ['MENSUEL','TRIMESTRIEL','ANNUEL','ILLIMITE'];

  // ── Computed ──

  /**
   * ✅ NOUVEAU — Projets d'entreprise uniquement, en excluant les projets
   * de stage (typeProjetId = 4). Appliqué en amont de filteredProjets()
   * pour que TOUT (recherche, filtres, pagination, stats KPI) ignore
   * systématiquement les projets de stage, sans devoir dupliquer ce filtre
   * partout.
   */
  projetsEntreprise = computed(() =>
      this.projets().filter(p => p.typeProjetId !== TYPE_PROJET_STAGE_ID));

  filteredProjets = computed(() => {
    let list = this.projetsEntreprise();
    const q = this.search().toLowerCase();
    if (this.filterStatutId())
      list = list.filter(p => p.statutProjetId === +this.filterStatutId());
    if (this.filterClient())
      list = list.filter(p => p.clientId === +this.filterClient());
    if (q) list = list.filter(p =>
      p.nom.toLowerCase().includes(q) ||
      (p.clientNom || '').toLowerCase().includes(q) ||
      (p.numeroProjet || '').toLowerCase().includes(q));
    return list;
  });

  totalPages   = computed(() => Math.max(1, Math.ceil(this.filteredProjets().length / this.pageSize())));
  pagesArray   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedProjets = computed(() => this.filteredProjets().slice(
    (this.currentPage()-1)*this.pageSize(),
    this.currentPage()*this.pageSize()
  ));

  allPageSelected = computed(() => {
    const p = this.pagedProjets();
    return p.length > 0 && p.every(x => this.selectedIds().has(x.id));
  });
  somePageSelected = computed(() => {
    const p = this.pagedProjets();
    return p.some(x => this.selectedIds().has(x.id)) && !this.allPageSelected();
  });
  selectedCount = computed(() => this.selectedIds().size);

  // ✅ Stats KPI calculées sur projetsEntreprise() (pas projets() brut) — les
  // projets de stage ne doivent pas gonfler les compteurs de cette page.
  statsEnCours = computed(() => this.projetsEntreprise().filter(p => {
    const s = this.statutsProjet().find(st => st.id === p.statutProjetId);
    return s?.code === 'EN_COURS';
  }).length);
  statsPlanifies = computed(() => this.projetsEntreprise().filter(p => {
    const s = this.statutsProjet().find(st => st.id === p.statutProjetId);
    return s?.code === 'PLANIFIE';
  }).length);
  statsTermines = computed(() => this.projetsEntreprise().filter(p => {
    const s = this.statutsProjet().find(st => st.id === p.statutProjetId);
    return s?.code === 'TERMINE';
  }).length);

  groupesDispo = computed(() => {
    const sel = new Set(this.groupesSelectionnes());
    return this.tousGroupes().filter(g => !sel.has(g.id));
  });
  groupesSelectionnesInfo = computed(() => {
    const sel = new Set(this.groupesSelectionnes());
    return this.tousGroupes().filter(g => sel.has(g.id));
  });
  activitesDispoProjet = computed(() => {
    const sel = new Set(this.activitesSelectionnees());
    return this.toutesActivites().filter(a => !sel.has(a.id));
  });
  activitesGlobalesDispo    = computed(() => this.activitesDispoProjet().filter(a => a.estGlobale));
  activitesNonGlobalesDispo = computed(() => this.activitesDispoProjet().filter(a => !a.estGlobale));
  activitesSelectionneesInfo = computed(() => {
    const sel = new Set(this.activitesSelectionnees());
    return this.toutesActivites().filter(a => sel.has(a.id));
  });

  // ── Lifecycle ──
  ngOnInit(): void {
    if (!this.perms.canSeeAnyProject()) { this.loading.set(false); return; }
    this.loadAll();
    this.subs.add(this.notifSvc.newNotification$.subscribe(n => {
      const t = String(n.type);
      if (['PROJET_COMMENTAIRE','PROJET_STATUT_CHANGE','PROJET_ASSIGNE'].includes(t))
        this.loadAll();
    }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  loadAll(): void {
    this.loading.set(true);
    this.projetSvc.getAll().subscribe({
      next: d => { this.projets.set(d); this.loading.set(false); },
      error: () => { this.ui.error('Erreur chargement projets.'); this.loading.set(false); }
    });
    this.projetSvc.getStatutsProjet().subscribe({ next: d => this.statutsProjet.set(d) });
    this.projetSvc.getTypesProjet().subscribe({ next: d => this.typesProjet.set(d) });
    if (this.perms.canViewCustomers())
      this.clientSvc.getAll(true).subscribe({ next: d => this.clients.set(d) });
    if (this.perms.canViewTeams())
      this.groupeSvc.getAll().subscribe({ next: d => this.tousGroupes.set(d) });
    if (this.perms.canViewAllActivities())
      this.activiteSvc.getAll().subscribe({ next: d => this.toutesActivites.set(d) });
    this.nomencSvc.getStatutsActivite().subscribe({ next: d => this.statutsActivite.set(d) });
  }

  selectProjet(projet: Projet): void { this.router.navigate(['/projets', projet.id]); }

  // ── CRUD ──
  openAddProjet(): void {
    if (!this.perms.canCreateProject()) { this.ui.warning('Permission PROJECT_CREATE requise.'); return; }
    this.editingProjet.set(null);
    this.projetFormClientId.set(null);
    this.groupesSelectionnes.set([]);
    this.activitesSelectionnees.set([]);
    this.projetForm.set({
      nom: '', description: '', couleur: '#6366f1',
      statutProjetId: this.statutsProjet().find(s => s.code === 'PLANIFIE')?.id,
      // ✅ Type par défaut = ENTREPRISE_INTERNE — jamais STAGE_ACADEMIQUE
      // depuis cette page (qui n'affiche/ne gère que les projets d'entreprise).
      typeProjetId:   this.typesProjet().find(t => t.code === 'ENTREPRISE_INTERNE')?.id,
      typeBudget: 'ILLIMITE', visible: true, facturable: true,
      autoriserActivitesGlobales: false,
      heuresEstimees: undefined, seuilAlerteHoraire: 80,
      groupeIds: [], activiteIds: []
    });
    this.showProjetModal.set(true);
  }

  openEditProjet(projet: Projet, e?: Event): void {
    if (e) e.stopPropagation();
    if (!this.perms.canEditAnyProject()) { this.ui.warning('Permission requise.'); return; }
    this.editingProjet.set(projet);
    this.openMenuId.set(null);
    const groupeIds = projet.groupes?.map(g => g.id) || [];
    this.groupesSelectionnes.set(groupeIds);

    if (this.perms.canViewAllActivities()) {
      this.activiteSvc.getByProjet(projet.id).subscribe({
        next: a => this.activitesSelectionnees.set(a.map(x => x.id)),
        error: () => this.activitesSelectionnees.set([])
      });
    }

    this.projetFormClientId.set(projet.clientId || null);
    this.projetForm.set({
      nom:                        projet.nom,
      description:                projet.description || '',
      couleur:                    projet.couleur || '#6366f1',
      clientId:                   projet.clientId,
      statutProjetId:             projet.statutProjetId,
      typeProjetId:               projet.typeProjetId,
      budgetPrevu:                projet.budgetPrevu,
      heuresEstimees:             projet.heuresEstimees,
      typeBudget:                 projet.typeBudget || 'ILLIMITE',
      seuilAlerteHoraire:         projet.seuilAlerteHoraire ?? 80,
      dateDebut:                  projet.dateDebut,
      dateFin:                    projet.dateFin,
      visible:                    projet.visible,
      facturable:                 projet.facturable,
      autoriserActivitesGlobales: projet.autoriserActivitesGlobales,
      responsableKeycloakId:      projet.responsableKeycloakId,
      groupeIds, activiteIds: []
    });
    this.showProjetModal.set(true);

    this.projetSvc.getById(projet.id).subscribe({
      next: detail => {
        const ids = detail.groupes?.map(g => g.id) || [];
        this.groupesSelectionnes.set(ids);
        this.projetFormClientId.set(detail.clientId || null);
        this.projetForm.update(f => ({ ...f, groupeIds: ids, clientId: detail.clientId }));
      },
      error: () => {}
    });
  }

  saveProjet(): void {
    const f: ProjetRequest = {
      ...this.projetForm(),
      clientId:    this.projetFormClientId() || undefined,
      groupeIds:   this.groupesSelectionnes(),
      activiteIds: this.activitesSelectionnees()
    };
    if (!f.nom?.trim()) { this.ui.warning('Le nom est obligatoire.'); return; }

    // ✅ Garde-fou — cette page ne doit jamais créer/modifier un projet vers
    // le type STAGE_ACADEMIQUE, même par erreur de sélection dans le select
    // "Type de projet" du formulaire (qui liste tous les types existants).
    if (f.typeProjetId === TYPE_PROJET_STAGE_ID) {
      this.ui.warning('Les projets de stage se gèrent depuis la page "Projets de stage".');
      return;
    }

    const editing = this.editingProjet();
    const obs = editing ? this.projetSvc.update(editing.id, f) : this.projetSvc.create(f);
    obs.subscribe({
      next: () => { this.ui.success(editing ? 'Projet mis à jour.' : 'Projet créé.'); this.closeProjetModal(); this.loadAll(); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  deleteProjet(projet: Projet, e?: Event): void {
    if (e) e.stopPropagation();
    if (!this.perms.canDeleteAllProjects()) { this.ui.warning('Permission PROJECT_DELETE_ALL requise.'); return; }
    this.ui.confirm({
      title: 'Supprimer', message: `Supprimer "${projet.nom}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this.projetSvc.delete(projet.id).subscribe({
        next: () => { this.ui.success('Projet supprimé.'); this.loadAll(); },
        error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
      })
    });
    this.openMenuId.set(null);
  }

  deleteBulkProjets(): void {
    if (!this.perms.canDeleteAllProjects()) { this.ui.warning('Permission requise.'); return; }
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    this.ui.confirm({
      title: `Supprimer ${ids.length} projet(s)`, message: 'Supprimer définitivement ?',
      confirmLabel: 'Tout supprimer', type: 'danger',
      onConfirm: () => this.projetSvc.deleteBulk(ids).subscribe({
        next: () => { this.ui.success(`${ids.length} projet(s) supprimé(s).`); this.clearSelection(); this.loadAll(); },
        error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
      })
    });
  }

  closeProjetModal(): void { this.showProjetModal.set(false); this.editingProjet.set(null); }

  addGroupeToForm(groupeId: number): void {
    if (!groupeId) return;
    const cur = this.groupesSelectionnes();
    if (!cur.includes(groupeId)) this.groupesSelectionnes.set([...cur, groupeId]);
  }
  removeGroupeFromForm(id: number): void {
    this.groupesSelectionnes.update(ids => ids.filter(i => i !== id));
  }
  addActiviteToProjet(activiteId: number): void {
    if (!activiteId) return;
    const cur = this.activitesSelectionnees();
    if (!cur.includes(activiteId)) this.activitesSelectionnees.set([...cur, activiteId]);
  }
  removeActiviteFromProjet(id: number): void {
    this.activitesSelectionnees.update(ids => ids.filter(i => i !== id));
  }

  // ── Pagination ──
  goToPage(page: number): void { if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page); }
  onPageSizeChange(size: number): void { this.pageSize.set(size); this.currentPage.set(1); }
  resetPage(): void { this.currentPage.set(1); }
  minVal(a: number, b: number): number { return Math.min(a, b); }

  // ── Sélection ──
  toggleSelectAll(): void {
    const p = this.pagedProjets();
    const s = new Set(this.selectedIds());
    this.allPageSelected() ? p.forEach(x => s.delete(x.id)) : p.forEach(x => s.add(x.id));
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

  closeMenu(): void { this.openMenuId.set(null); this.filterPanelOpenP.set(false); }

  // ── Helpers statut via nomenclature ──
  getStatutColor(statutProjetId?: number): string {
    const s = this.statutsProjet().find(st => st.id === statutProjetId);
    return s?.couleur || '#94a3b8';
  }
  getStatutLabel(statutProjetId?: number): string {
    const s = this.statutsProjet().find(st => st.id === statutProjetId);
    return s?.libelle || '—';
  }
  getAvancementCouleur(pct: number): string {
    if (pct >= 100) return '#10b981';
    if (pct >= 60)  return '#3b82f6';
    if (pct >= 30)  return '#f97316';
    return '#94a3b8';
  }
  fmtDate(d?: string | Date): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '—';
    const M = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(date.getDate()).padStart(2,'0')} ${M[date.getMonth()]}, ${date.getFullYear()}`;
  }
  fmtHeures(h: number): string {
    if (!h || h <= 0) return '0h';
    const heures  = Math.floor(h);
    const minutes = Math.round((h - heures) * 60);
    return minutes > 0 ? `${heures}h${String(minutes).padStart(2,'0')}` : `${heures}h`;
  }
}