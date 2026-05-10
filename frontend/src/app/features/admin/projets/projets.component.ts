// projets.component.ts — COMPLET FINAL
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ProjetService }         from '../../../services/projet.service';
import { ClientService }         from '../../../services/client.service';
import { MembreEquipeService }   from '../../../services/membre-equipe.service';
import { ActiviteService }       from '../../../services/activite.service';
import { StatutActiviteService } from '../../../services/statutactivite.service';
import { GroupeService, GroupeRequest } from '../../../services/groupe.service';
import { UserService }           from '../../../services/user.service';
import { UiService }             from '../../../services/ui.service';
import { ErrorService }          from '../../../services/error.service';

import { Projet, ProjetRequest } from '../../../shared/models/projet.model';
import { Client }                from '../../../shared/models/client.model';
import { MembreEquipe }          from '../../../shared/models/membre-equipe.model';
import { Activite, ActiviteRequest } from '../../../shared/models/activite.model';
import { StatutActivite }        from '../../../shared/models/statut-activite.model';
import { Groupe }                from '../../../shared/models/groupe.model';
import { Utilisateur }           from '../../../shared/models/utilisateur.model';
import { HttpErrorResponse }     from '@angular/common/http';

@Component({
  selector: 'app-projets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projets.component.html',
  styleUrls: ['./projets.component.css']
})
export class ProjetsComponent implements OnInit {

  private projetSvc   = inject(ProjetService);
  private clientSvc   = inject(ClientService);
  private membreSvc   = inject(MembreEquipeService);
  private activiteSvc = inject(ActiviteService);
  private nomencSvc   = inject(StatutActiviteService);
  private groupeSvc   = inject(GroupeService);
  private userSvc     = inject(UserService);
  private errorSvc    = inject(ErrorService);
  private router      = inject(Router);
  readonly ui         = inject(UiService);
  readonly Math       = Math;

  // ── Données ──
  projets         = signal<Projet[]>([]);
  clients         = signal<Client[]>([]);
  utilisateurs    = signal<Utilisateur[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);
  membres         = signal<MembreEquipe[]>([]);
  activitesDuProjet = signal<Activite[]>([]); // activités du projet sélectionné dans slide-over
  tousGroupes     = signal<Groupe[]>([]);
  toutesActivites = signal<Activite[]>([]); // toutes les activités disponibles

  // ── UI ──
  loading           = signal(true);
  filterPanelOpenP  = signal(false);

  // ── Filtres ──
  filterStatut = signal('');
  filterClient = signal<number | ''>('');
  search       = signal('');

  // ── Sélection tableau ──
  selectedIds = signal<Set<number>>(new Set());
  pageSize    = signal(10);
  currentPage = signal(1);
  openMenuId  = signal<number | null>(null);

  // ── Modaux ──
  showProjetModal   = signal(false);
  showActiviteModal = signal(false);
  showGroupeModal   = signal(false);
  editingProjet     = signal<Projet | null>(null);
  editingActivite   = signal<Activite | null>(null);

  // ── Formulaire projet ──
  projetForm = signal<ProjetRequest>({
    nom: '', description: '', couleur: '#6366f1', statut: 'PLANIFIE',
    typeBudget: 'ILLIMITE', visible: true, facturable: true,
    autoriserActivitesGlobales: false,
    quotaHoraire: undefined, seuilAlerteHoraire: 80, groupeIds: [], activiteIds: []
  });
  projetFormClientId  = signal<number | null>(null);
  groupesSelectionnes = signal<number[]>([]);
  activitesSelectionnees = signal<number[]>([]); // ✅ IDs activités assignées

  // ── Formulaire activité (depuis slide-over projet) ──
  activiteForm = signal<ActiviteRequest>({
    nom: '', description: '', couleur: '#10b981', statutActiviteId: 1,
    typeBudget: 'ILLIMITE', visible: true, facturable: true, priorite: 2,
    estGlobale: false
  });

  // ── Formulaire groupe ──
  groupeForm = signal<GroupeRequest & { membresIds: number[] }>({
    nom: '', description: '', couleur: '#6366f1', actif: true, membresIds: []
  });

  // ── Constantes ──
  readonly COULEURS       = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#10b981','#06b6d4','#3b82f6','#64748b'];
  readonly STATUTS_PROJET = ['PLANIFIE','EN_COURS','SUSPENDU','TERMINE','ANNULE'];
  readonly TYPES_BUDGET   = ['MENSUEL','TRIMESTRIEL','ANNUEL','ILLIMITE'];
  readonly PRIORITES      = [
    { value: 1, label: 'Basse' }, { value: 2, label: 'Normale' },
    { value: 3, label: 'Haute' }, { value: 4, label: 'Urgente' }
  ];
  readonly COULEURS_ACTIVITE = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#10b981','#06b6d4','#3b82f6','#64748b'];

  // ── Computed ──
  filteredProjets = computed(() => {
    let list = this.projets();
    const q  = this.search().toLowerCase();
    if (this.filterStatut()) list = list.filter(p => p.statut === this.filterStatut());
    if (this.filterClient()) list = list.filter(p => p.clientId === +this.filterClient());
    if (q) list = list.filter(p =>
      p.nom.toLowerCase().includes(q) ||
      (p.clientNom || '').toLowerCase().includes(q) ||
      (p.numeroProjet || '').toLowerCase().includes(q));
    return list;
  });

  totalPages   = computed(() => Math.max(1, Math.ceil(this.filteredProjets().length / this.pageSize())));
  pagesArray   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedProjets = computed(() => this.filteredProjets().slice((this.currentPage()-1)*this.pageSize(), this.currentPage()*this.pageSize()));

  allPageSelected  = computed(() => { const p = this.pagedProjets(); return p.length > 0 && p.every(x => this.selectedIds().has(x.id)); });
  somePageSelected = computed(() => { const p = this.pagedProjets(); return p.some(x => this.selectedIds().has(x.id)) && !this.allPageSelected(); });
  selectedCount    = computed(() => this.selectedIds().size);

  statsEnCours   = computed(() => this.projets().filter(p => p.statut === 'EN_COURS').length);
  statsPlanifies = computed(() => this.projets().filter(p => p.statut === 'PLANIFIE').length);
  statsTermines  = computed(() => this.projets().filter(p => p.statut === 'TERMINE').length);

  // Groupes disponibles (non déjà sélectionnés)
  groupesDispo = computed(() => {
    const sel = new Set(this.groupesSelectionnes());
    return this.tousGroupes().filter(g => !sel.has(g.id));
  });
  groupesSelectionnesInfo = computed(() => {
    const sel = new Set(this.groupesSelectionnes());
    return this.tousGroupes().filter(g => sel.has(g.id));
  });

  // ✅ Activités disponibles pour assignation au projet
  activitesDispoProjet = computed(() => {
    const sel = new Set(this.activitesSelectionnees());
    return this.toutesActivites().filter(a => !sel.has(a.id));
  });
  activitesGlobalesDispo = computed(() => this.activitesDispoProjet().filter(a => a.estGlobale));
  activitesNonGlobalesDispo = computed(() => this.activitesDispoProjet().filter(a => !a.estGlobale));
  activitesSelectionneesInfo = computed(() => {
    const sel = new Set(this.activitesSelectionnees());
    return this.toutesActivites().filter(a => sel.has(a.id));
  });

  // ── Lifecycle ──
  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    this.projetSvc.getAll().subscribe({
      next: d => { this.projets.set(d); this.loading.set(false); },
      error: () => { this.ui.error('Erreur chargement projets.'); this.loading.set(false); }
    });
    this.clientSvc.getAll(true).subscribe({ next: d => this.clients.set(d) });
    this.userSvc.getAllUsers().subscribe({ next: d => this.utilisateurs.set(d) });
    this.nomencSvc.getStatutsActivite().subscribe({ next: d => this.statutsActivite.set(d) });
    this.groupeSvc.getAll().subscribe({ next: d => this.tousGroupes.set(d) });
    // ✅ Charger toutes les activités pour le select d'assignation
    this.activiteSvc.getAll().subscribe({ next: d => this.toutesActivites.set(d), error: () => {} });
  }

  // ── Navigation ──
  selectProjet(projet: Projet): void { this.router.navigate(['/projets', projet.id]); }

  loadActivitesDuProjet(id: number): void {
    this.activiteSvc.getByProjet(id).subscribe({ next: d => this.activitesDuProjet.set(d) });
  }

  // ── CRUD Projet ──
  openAddProjet(): void {
    this.editingProjet.set(null);
    this.projetFormClientId.set(null);
    this.groupesSelectionnes.set([]);
    this.activitesSelectionnees.set([]);
    this.projetForm.set({
      nom: '', description: '', couleur: '#6366f1', statut: 'PLANIFIE',
      typeBudget: 'ILLIMITE', visible: true, facturable: true,
      autoriserActivitesGlobales: false,
      quotaHoraire: undefined, seuilAlerteHoraire: 80, groupeIds: [], activiteIds: []
    });
    this.showProjetModal.set(true);
  }

  openEditProjet(projet: Projet, e?: Event): void {
    if (e) e.stopPropagation();
    this.editingProjet.set(projet);
    this.openMenuId.set(null);
    const groupeIds = projet.groupes?.map(g => g.id) || [];
    this.groupesSelectionnes.set(groupeIds);

    // ✅ Charger les activités actuellement assignées
    this.activiteSvc.getByProjet(projet.id).subscribe({
      next: activites => this.activitesSelectionnees.set(activites.map(a => a.id)),
      error: () => this.activitesSelectionnees.set([])
    });

    this.projetForm.set({
      nom: projet.nom, description: (projet as any).description || '',
      couleur: projet.couleur || '#6366f1', clientId: (projet as any).clientId,
      statut: projet.statut, budgetPrevu: (projet as any).budgetPrevu,
      quotaHoraire: (projet as any).quotaHoraire, typeBudget: (projet as any).typeBudget || 'ILLIMITE',
      seuilAlerteHoraire: (projet as any).seuilAlerteHoraire ?? 80,
      dateDebut: (projet as any).dateDebut, dateFin: (projet as any).dateFin,
      visible: projet.visible, facturable: projet.facturable,
      autoriserActivitesGlobales: projet.autoriserActivitesGlobales,
      responsableKeycloakId: (projet as any).responsableKeycloakId,
      groupeIds, activiteIds: []
    });
    this.projetFormClientId.set((projet as any).clientId || null);
    this.showProjetModal.set(true);

    // Enrichir depuis le backend
    this.projetSvc.getById(projet.id).subscribe({
      next: detail => {
        const ids = detail.groupes?.map(g => g.id) || [];
        this.groupesSelectionnes.set(ids);
        this.projetFormClientId.set(detail.clientId || null);
        this.projetForm.set({
          nom: detail.nom, description: detail.description || '',
          couleur: detail.couleur || '#6366f1', clientId: detail.clientId,
          statut: detail.statut, budgetPrevu: detail.budgetPrevu,
          quotaHoraire: detail.quotaHoraire, typeBudget: detail.typeBudget || 'ILLIMITE',
          seuilAlerteHoraire: detail.seuilAlerteHoraire ?? 80,
          dateDebut: detail.dateDebut, dateFin: detail.dateFin,
          visible: detail.visible, facturable: detail.facturable,
          autoriserActivitesGlobales: detail.autoriserActivitesGlobales,
          responsableKeycloakId: detail.responsableKeycloakId,
          groupeIds: ids, activiteIds: this.activitesSelectionnees()
        });
      },
      error: () => {}
    });
  }

  saveProjet(): void {
    const f = {
      ...this.projetForm(),
      clientId:    this.projetFormClientId() || undefined,
      groupeIds:   this.groupesSelectionnes(),
      activiteIds: this.activitesSelectionnees() // ✅
    };
    if (!f.nom?.trim()) { this.ui.warning('Le nom du projet est obligatoire.'); return; }
    const editing = this.editingProjet();
    const obs = editing ? this.projetSvc.update(editing.id, f) : this.projetSvc.create(f);
    obs.subscribe({
      next: () => { this.ui.success(editing ? 'Projet mis à jour.' : 'Projet créé.'); this.closeProjetModal(); this.loadAll(); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  deleteProjet(projet: Projet, e?: Event): void {
    if (e) e.stopPropagation();
    this.ui.confirm({
      title: 'Supprimer le projet', message: `Supprimer "${projet.nom}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        this.projetSvc.delete(projet.id).subscribe({
          next: () => { this.ui.success('Projet supprimé.'); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
    this.openMenuId.set(null);
  }

  deleteBulkProjets(): void {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    this.ui.confirm({
      title: `Supprimer ${ids.length} projet(s)`, message: `Supprimer définitivement ?`,
      confirmLabel: 'Tout supprimer', type: 'danger',
      onConfirm: () => {
        this.projetSvc.deleteBulk(ids).subscribe({
          next: () => { this.ui.success(`${ids.length} projet(s) supprimé(s).`); this.clearSelection(); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  closeProjetModal(): void { this.showProjetModal.set(false); this.editingProjet.set(null); }

  // ── Gestion groupes formulaire ──
  addGroupeToForm(groupeId: number): void {
    if (!groupeId) return;
    const cur = this.groupesSelectionnes();
    if (!cur.includes(groupeId)) this.groupesSelectionnes.set([...cur, groupeId]);
  }
  removeGroupeFromForm(groupeId: number): void {
    this.groupesSelectionnes.update(ids => ids.filter(id => id !== groupeId));
  }

  // ✅ Gestion activités formulaire
  addActiviteToProjet(activiteId: number): void {
    if (!activiteId) return;
    const cur = this.activitesSelectionnees();
    if (!cur.includes(activiteId)) this.activitesSelectionnees.set([...cur, activiteId]);
  }
  removeActiviteFromProjet(activiteId: number): void {
    this.activitesSelectionnees.update(ids => ids.filter(id => id !== activiteId));
  }

  // ── Création groupe ──
  openCreateGroupe(): void {
    this.groupeForm.set({ nom: '', description: '', couleur: '#6366f1', actif: true, membresIds: [] });
    this.showGroupeModal.set(true);
  }

  saveGroupe(): void {
    const f = this.groupeForm();
    if (!f.nom?.trim()) { this.ui.warning('Le nom du groupe est obligatoire.'); return; }
    this.groupeSvc.create(f).subscribe({
      next: nouveauGroupe => {
        this.ui.success(`Équipe "${nouveauGroupe.nom}" créée.`);
        this.showGroupeModal.set(false);
        this.groupeSvc.getAll().subscribe({ next: d => this.tousGroupes.set(d) });
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  // ── Activités (depuis page détail projet via navigate) ──
  openAddActivite(): void {
    this.editingActivite.set(null);
    const s = this.statutsActivite()[0];
    this.activiteForm.set({
      nom: '', description: '', couleur: '#10b981',
      statutActiviteId: s?.id || 1,
      typeBudget: 'ILLIMITE', visible: true, facturable: true, priorite: 2,
      estGlobale: false
    });
    this.showActiviteModal.set(true);
  }

  openEditActivite(a: Activite): void {
    this.editingActivite.set(a);
    this.activiteForm.set({
      nom: a.nom, description: a.description || '', couleur: a.couleur || '#10b981',
      statutActiviteId: a.statutActiviteId, budget: a.budget, quotaHoraire: a.quotaHoraire,
      typeBudget: a.typeBudget || 'ILLIMITE', visible: a.visible, facturable: a.facturable,
      estGlobale: a.estGlobale || false, priorite: a.priorite,
      dateEcheance: a.dateEcheance, heuresEstimees: a.heuresEstimees,
      utilisateurId: a.utilisateurId
    });
    this.showActiviteModal.set(true);
  }

  saveActivite(): void {
    const f = this.activiteForm();
    if (!f.nom?.trim()) { this.ui.warning('Le nom est obligatoire.'); return; }
    const editing = this.editingActivite();
    const obs = editing ? this.activiteSvc.update(editing.id, f) : this.activiteSvc.create(f);
    obs.subscribe({
      next: () => {
        this.ui.success(editing ? 'Activité mise à jour.' : 'Activité créée.');
        this.showActiviteModal.set(false);
        this.editingActivite.set(null);
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
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

  // ── Menu ──
  toggleMenu(id: number, e: Event): void {
    e.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }
  closeMenu(): void { this.openMenuId.set(null); this.filterPanelOpenP.set(false); }

  // ── Helpers ──
  getStatutColor(s: string): string {
    return ({ PLANIFIE: '#6366f1', EN_COURS: '#10b981', SUSPENDU: '#f97316', TERMINE: '#64748b', ANNULE: '#ef4444' } as any)[s] || '#94a3b8';
  }
  getStatutLabel(s: string): string {
    return ({ PLANIFIE: 'Planifié', EN_COURS: 'En cours', SUSPENDU: 'Suspendu', TERMINE: 'Terminé', ANNULE: 'Annulé' } as any)[s] || s;
  }
  getAvancementCouleur(avancement?: number): string {
    const pct = avancement || 0;
    if (pct >= 100) return '#10b981';
    if (pct >= 60)  return '#3b82f6';
    if (pct >= 30)  return '#f97316';
    return '#94a3b8';
  }
  fmtDate(d?: string | Date): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '—';
    const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(date.getDate()).padStart(2,'0')} ${MOIS[date.getMonth()]}, ${date.getFullYear()}`;
  }
}