// src/app/features/projets/projets.component.ts  — V7
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

export interface UtilisateurParEquipe {
  groupeNom: string;
  groupeCouleur: string;
  utilisateurs: { id: number; nom: string }[];
}

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
  readonly ui         = inject(UiService);
  readonly Math       = Math;

  projets         = signal<Projet[]>([]);
  clients         = signal<Client[]>([]);
  utilisateurs    = signal<Utilisateur[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);
  membres         = signal<MembreEquipe[]>([]);
  activites       = signal<Activite[]>([]);
  tousGroupes     = signal<Groupe[]>([]);

  loading        = signal(true);
  selectedProjet = signal<Projet | null>(null);
  detailTab      = signal<'infos' | 'equipes' | 'activites'>('infos');
  viewMode       = signal<'liste' | 'kanban'>('liste');

  filterStatut = signal('');
  filterClient = signal<number | ''>('');
  search       = signal('');

  selectedIds = signal<Set<number>>(new Set());
  pageSize    = signal(10);
  currentPage = signal(1);
  openMenuId  = signal<number | null>(null);

  showProjetModal   = signal(false);
  showActiviteModal = signal(false);
  showGroupeModal   = signal(false);
  editingProjet     = signal<Projet | null>(null);
  editingActivite   = signal<Activite | null>(null);

  projetForm = signal<ProjetRequest>({
    nom: '', description: '', couleur: '#6366f1', statut: 'PLANIFIE',
    typeBudget: 'ILLIMITE', visible: true, facturable: true,
    autoriserActivitesGlobales: false,
    quotaHoraire: undefined, seuilAlerteHoraire: 80, groupeIds: []
  });
  projetFormClientId  = signal<number | null>(null);
  groupesSelectionnes = signal<number[]>([]);

  activiteForm = signal<ActiviteRequest>({
    nom: '', description: '', couleur: '#10b981', statutActiviteId: 1,
    typeBudget: 'ILLIMITE', visible: true, facturable: true, priorite: 2
  });

  // ✅ Formulaire nouveau groupe avec membres sélectionnables
  groupeForm = signal<GroupeRequest & { membresIds: number[] }>({
    nom: '', description: '', couleur: '#6366f1', actif: true, membresIds: []
  });

  readonly COULEURS       = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#10b981','#06b6d4','#3b82f6','#64748b'];
  readonly STATUTS_PROJET = ['PLANIFIE','EN_COURS','SUSPENDU','TERMINE','ANNULE'];
  readonly TYPES_BUDGET   = ['MENSUEL','TRIMESTRIEL','ANNUEL','ILLIMITE'];

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
  pagedProjets = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredProjets().slice(start, start + this.pageSize());
  });
  allPageSelected  = computed(() => { const p = this.pagedProjets(); return p.length > 0 && p.every(x => this.selectedIds().has(x.id)); });
  somePageSelected = computed(() => { const p = this.pagedProjets(); return p.some(x => this.selectedIds().has(x.id)) && !this.allPageSelected(); });
  selectedCount    = computed(() => this.selectedIds().size);

  groupesDispo = computed(() => {
    const sel = new Set(this.groupesSelectionnes());
    return this.tousGroupes().filter(g => !sel.has(g.id));
  });
  groupesSelectionnesInfo = computed(() => {
    const sel = new Set(this.groupesSelectionnes());
    return this.tousGroupes().filter(g => sel.has(g.id));
  });

  // ✅ Utilisateurs membres du groupe form (pour afficher qui est déjà sélectionné)
  membresGroupeSelectionnesInfo = computed(() => {
    const ids = this.groupeForm().membresIds || [];
    return this.utilisateurs().filter(u => ids.includes(u.id));
  });
  utilisateursDispoGroupeForm = computed(() => {
    const ids = new Set(this.groupeForm().membresIds || []);
    return this.utilisateurs().filter(u => !ids.has(u.id));
  });

  utilisateursParEquipe = computed((): UtilisateurParEquipe[] => {
    const projet = this.selectedProjet();
    if (!projet || !projet.groupes || projet.groupes.length === 0) {
      return [];
    }
    const result: UtilisateurParEquipe[] = [];
    for (const groupe of projet.groupes) {
      const groupeComplet = this.tousGroupes().find(g => g.id === groupe.id);
      if (!groupeComplet || !groupeComplet.membres || groupeComplet.membres.length === 0) continue;
      result.push({
        groupeNom: groupeComplet.nom,
        groupeCouleur: groupeComplet.couleur || '#6366f1',
        utilisateurs: groupeComplet.membres.map((u: any) => ({
          id: u.id,
          nom: `${u.prenom || ''} ${u.nom || ''}`.trim()
        }))
      });
    }
    if (result.length === 0) {
      const m = this.membres();
      if (m.length > 0) return [{ groupeNom: 'Membres du projet', groupeCouleur: '#6366f1',
        utilisateurs: m.map(mb => ({ id: mb.utilisateurId, nom: `${mb.utilisateurPrenom||''} ${mb.utilisateurNom||''}`.trim() })) }];
    }
    return result;
  });

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
  }

  // ✅ FIX — selectProjet ne toast PAS d'erreur si getById échoue,
  // il affiche quand même le slide-over avec les données disponibles
  selectProjet(projet: Projet): void {
    this.openMenuId.set(null);
    // Afficher le slide-over immédiatement avec les données du tableau
    this.selectedProjet.set(projet);
    this.detailTab.set('infos');
    this.loadMembres(projet.id);
    this.loadActivites(projet.id);
    // Essayer de recharger les détails complets (avec groupes) silencieusement
    this.projetSvc.getById(projet.id).subscribe({
      next: detail => this.selectedProjet.set(detail),
      error: () => { /* silencieux — on garde les données du tableau */ }
    });
  }

  loadMembres(id: number): void {
    this.membreSvc.getByProjet(id).subscribe({ next: d => this.membres.set(d) });
  }

  loadActivites(id: number): void {
    this.activiteSvc.getByProjet(id).subscribe({ next: d => this.activites.set(d) });
  }

  // ── CRUD Projet ──
  openAddProjet(): void {
    this.editingProjet.set(null);
    this.projetFormClientId.set(null);
    this.groupesSelectionnes.set([]);
    this.projetForm.set({
      nom:'', description:'', couleur:'#6366f1', statut:'PLANIFIE',
      typeBudget:'ILLIMITE', visible:true, facturable:true,
      autoriserActivitesGlobales:false,
      quotaHoraire: undefined, seuilAlerteHoraire: 80, groupeIds: []
    });
    this.showProjetModal.set(true);
  }

  // ✅ FIX — openEditProjet affiche le modal immédiatement avec les données disponibles,
  // puis les met à jour silencieusement si getById réussit
  openEditProjet(projet: Projet): void {
    this.editingProjet.set(projet);
    this.openMenuId.set(null);
    // Préremplir avec les données déjà disponibles
    this.projetFormClientId.set((projet as any).clientId || null);
    const groupeIds = projet.groupes?.map(g => g.id) || [];
    this.groupesSelectionnes.set(groupeIds);
    this.projetForm.set({
      nom: projet.nom, description: (projet as any).description || '',
      couleur: projet.couleur || '#6366f1', clientId: (projet as any).clientId,
      statut: projet.statut, budgetPrevu: (projet as any).budgetPrevu,
      quotaHoraire: (projet as any).quotaHoraire, typeBudget: (projet as any).typeBudget || 'ILLIMITE',
      seuilAlerteHoraire: (projet as any).seuilAlerteHoraire ?? 80,
      dateDebut: (projet as any).dateDebut, dateFin: (projet as any).dateFin,
      visible: projet.visible, facturable: projet.facturable,
      autoriserActivitesGlobales: projet.autoriserActivitesGlobales,
      responsableKeycloakId: (projet as any).responsableKeycloakId, groupeIds
    });
    this.showProjetModal.set(true);
    // Essayer d'enrichir depuis le backend (silencieux si erreur)
    this.projetSvc.getById(projet.id).subscribe({
      next: detail => {
        this.projetFormClientId.set(detail.clientId || null);
        const ids = detail.groupes?.map(g => g.id) || [];
        this.groupesSelectionnes.set(ids);
        this.projetForm.set({
          nom: detail.nom, description: detail.description || '',
          couleur: detail.couleur || '#6366f1', clientId: detail.clientId,
          statut: detail.statut, budgetPrevu: detail.budgetPrevu,
          quotaHoraire: detail.quotaHoraire, typeBudget: detail.typeBudget || 'ILLIMITE',
          seuilAlerteHoraire: detail.seuilAlerteHoraire ?? 80,
          dateDebut: detail.dateDebut, dateFin: detail.dateFin,
          visible: detail.visible, facturable: detail.facturable,
          autoriserActivitesGlobales: detail.autoriserActivitesGlobales,
          responsableKeycloakId: detail.responsableKeycloakId, groupeIds: ids
        });
      },
      error: () => { /* silencieux — formulaire reste prérempli */ }
    });
  }

  saveProjet(): void {
    const f = { ...this.projetForm(), clientId: this.projetFormClientId() || undefined, groupeIds: this.groupesSelectionnes() };
    if (!f.nom?.trim()) { this.ui.warning('Le nom du projet est obligatoire.'); return; }
    const editing = this.editingProjet();
    const obs = editing ? this.projetSvc.update(editing.id, f) : this.projetSvc.create(f);
    obs.subscribe({
      next: () => { this.ui.success(editing ? 'Projet mis à jour.' : 'Projet créé.'); this.closeProjetModal(); this.loadAll(); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  deleteProjet(projet: Projet): void {
    this.ui.confirm({
      title: 'Supprimer le projet', message: `Supprimer "${projet.nom}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        this.projetSvc.delete(projet.id).subscribe({
          next: () => { this.ui.success('Projet supprimé.'); if (this.selectedProjet()?.id === projet.id) this.selectedProjet.set(null); this.loadAll(); },
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
      title: `Supprimer ${ids.length} projet(s)`,
      message: `Supprimer définitivement ${ids.length} projet(s) ?`,
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

  addGroupeToForm(groupeId: number): void {
    if (!groupeId) return;
    const cur = this.groupesSelectionnes();
    if (!cur.includes(groupeId)) this.groupesSelectionnes.set([...cur, groupeId]);
  }
  removeGroupeFromForm(groupeId: number): void {
    this.groupesSelectionnes.update(ids => ids.filter(id => id !== groupeId));
  }

  // ── Gestion équipes slide-over ──
  addGroupeToProjet(groupeId: number): void {
    const p = this.selectedProjet();
    if (!p || !groupeId) return;
    const currentIds = (p.groupes || []).map(g => g.id);
    if (currentIds.includes(groupeId)) return;
    this.projetSvc.update(p.id, { nom: p.nom, statut: p.statut, groupeIds: [...currentIds, groupeId] } as any).subscribe({
      next: saved => {
        this.ui.success('Équipe ajoutée.');
        this.selectedProjet.set(saved);
        this.loadAll();
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  removeGroupeFromProjet(groupeId: number): void {
    const p = this.selectedProjet();
    if (!p) return;
    const newIds = (p.groupes || []).map(g => g.id).filter(id => id !== groupeId);
    this.projetSvc.update(p.id, { nom: p.nom, statut: p.statut, groupeIds: newIds } as any).subscribe({
      next: saved => {
        this.ui.success('Équipe retirée.');
        this.selectedProjet.set(saved);
        this.loadAll();
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  isGroupeAssigne(groupe: Groupe): boolean {
    const projet = this.selectedProjet();
    if (!projet || !projet.groupes) return false;
    return projet.groupes.some(pg => pg.id === groupe.id);
  }

  // ✅ Créer groupe avec membres depuis slide-over
  openCreateGroupe(): void {
    this.groupeForm.set({ nom: '', description: '', couleur: '#6366f1', actif: true, membresIds: [] });
    this.showGroupeModal.set(true);
  }

  addMembreToGroupeForm(userId: number): void {
    if (!userId) return;
    const cur = this.groupeForm().membresIds || [];
    if (!cur.includes(userId)) {
      this.groupeForm.set({ ...this.groupeForm(), membresIds: [...cur, userId] });
    }
  }

  removeMembreFromGroupeForm(userId: number): void {
    const cur = this.groupeForm().membresIds || [];
    this.groupeForm.set({ ...this.groupeForm(), membresIds: cur.filter(id => id !== userId) });
  }

  saveGroupe(): void {
    const f = this.groupeForm();
    if (!f.nom?.trim()) { this.ui.warning('Le nom du groupe est obligatoire.'); return; }
    this.groupeSvc.create(f).subscribe({
      next: nouveauGroupe => {
        this.ui.success(`Équipe "${nouveauGroupe.nom}" créée.`);
        this.showGroupeModal.set(false);
        this.groupeSvc.getAll().subscribe({ next: d => {
          this.tousGroupes.set(d);
          this.addGroupeToProjet(nouveauGroupe.id);
        }});
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  getGroupeIndicateurCouleur(g: Groupe): string {
    const n = this.projets().filter(p => p.groupes?.some(pg => pg.id === g.id) && p.statut === 'EN_COURS').length;
    return n <= 2 ? '#10b981' : n <= 4 ? '#f59e0b' : '#ef4444';
  }
  getGroupeNombreProjets(g: Groupe): number {
    return this.projets().filter(p => p.groupes?.some(pg => pg.id === g.id) && p.statut === 'EN_COURS').length;
  }

  // ── Activités ──
  openAddActivite(): void {
    this.editingActivite.set(null);
    const s = this.statutsActivite()[0];
    this.activiteForm.set({
      nom:'', description:'', couleur:'#10b981',
      statutActiviteId: s?.id || 1,
      typeBudget:'ILLIMITE', visible:true, facturable:true, priorite:2,
      projetId: this.selectedProjet()?.id
    });
    this.showActiviteModal.set(true);
  }

  openEditActivite(a: Activite): void {
    this.editingActivite.set(a);
    this.activiteForm.set({
      nom: a.nom, description: a.description || '', couleur: a.couleur || '#10b981',
      statutActiviteId: a.statutActiviteId, budget: a.budget, quotaHoraire: a.quotaHoraire,
      typeBudget: a.typeBudget || 'ILLIMITE', visible: a.visible, facturable: a.facturable,
      priorite: a.priorite, dateEcheance: a.dateEcheance, heuresEstimees: a.heuresEstimees,
      utilisateurId: a.utilisateurId, projetId: a.projetId
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
        const p = this.selectedProjet(); if (p) this.loadActivites(p.id);
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  deleteActivite(a: Activite): void {
    this.ui.confirm({ title: 'Supprimer', message: `Supprimer "${a.nom}" ?`, confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        this.activiteSvc.delete(a.id).subscribe({
          next: () => { const p = this.selectedProjet(); if (p) this.loadActivites(p.id); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  goToPage(page: number): void { if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page); }
  onPageSizeChange(size: number): void { this.pageSize.set(size); this.currentPage.set(1); }
  resetPage(): void { this.currentPage.set(1); }
  minVal(a: number, b: number): number { return Math.min(a, b); }

  toggleSelectAll(): void {
    const p = this.pagedProjets();
    if (this.allPageSelected()) { const s = new Set(this.selectedIds()); p.forEach(x => s.delete(x.id)); this.selectedIds.set(s); }
    else { const s = new Set(this.selectedIds()); p.forEach(x => s.add(x.id)); this.selectedIds.set(s); }
  }
  toggleSelect(id: number, e: Event): void { e.stopPropagation(); const s = new Set(this.selectedIds()); s.has(id) ? s.delete(id) : s.add(id); this.selectedIds.set(s); }
  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  clearSelection(): void { this.selectedIds.set(new Set()); }

  toggleMenu(id: number, e: Event): void { e.stopPropagation(); this.openMenuId.set(this.openMenuId() === id ? null : id); }
  closeMenu(): void { this.openMenuId.set(null); 
    this.filterPanelOpenP.set(false);
  }

  getStatutColor(s: string): string { return ({ PLANIFIE:'#6366f1', EN_COURS:'#10b981', SUSPENDU:'#f97316', TERMINE:'#64748b', ANNULE:'#ef4444' } as any)[s] || '#94a3b8'; }
  getStatutLabel(s: string): string { return ({ PLANIFIE:'Planifié', EN_COURS:'En cours', SUSPENDU:'Suspendu', TERMINE:'Terminé', ANNULE:'Annulé' } as any)[s] || s; }
  getPrioriteCouleur(p: number): string { return ['','#10b981','#3b82f6','#f97316','#ef4444'][p] || '#3b82f6'; }
  getActivitesByStatut(id: number): Activite[] { return this.activites().filter(a => a.statutActiviteId === id); }




  // ── Stats computed ──
statsEnCours  = computed(() => this.projets().filter(p => p.statut === 'EN_COURS').length);
statsPlanifies = computed(() => this.projets().filter(p => p.statut === 'PLANIFIE').length);
statsTermines  = computed(() => this.projets().filter(p => p.statut === 'TERMINE').length);
 
// ── Couleur barre avancement ──
getAvancementCouleur(avancement?: number): string {
  const pct = avancement || 0;
  if (pct >= 100) return '#10b981';
  if (pct >= 60)  return '#3b82f6';
  if (pct >= 30)  return '#f97316';
  return '#94a3b8';
}
 
// ── Format date "20 Avr, 2026" ──
fmtDate(d?: string | Date): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  return `${String(date.getDate()).padStart(2,'0')} ${MOIS[date.getMonth()]}, ${date.getFullYear()}`;
}

filterPanelOpenP = signal(false);

}