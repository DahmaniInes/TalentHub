import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProjetService }            from '../../../services/projet.service';
import { ActiviteService }          from '../../../services/activite.service';
import { CommentaireService }        from '../../../services/commentaire.service';
import { StatutActiviteService }    from '../../../services/statutactivite.service';
import { GroupeService }            from '../../../services/groupe.service';
import { DocumentService }          from '../../../services/document.service';
import { KeycloakService }          from '../../../services/keycloak.service';
import { UiService }                from '../../../services/ui.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { NotificationService }      from '../../../services/notification.service';

import { Projet, ProjetRequest, StatutProjet, TypeProjet } from '../../../shared/models/projet.model';
import { Activite, ActiviteRequest }     from '../../../shared/models/activite.model';
import { Commentaire }                   from '../../../shared/models/commentaire.model';
import { StatutActivite }                from '../../../shared/models/statut-activite.model';
import { Groupe }                        from '../../../shared/models/groupe.model';
import { Document as DocModel, TypeDocument } from '../../../shared/models/document.model';
import { HttpErrorResponse }             from '@angular/common/http';

type VueActivites = 'kanban' | 'liste' | 'timeline';

// Interface interne pour les team leads
interface TeamLeadInfo {
  id: number;
  nomComplet: string;
  email: string;
  photoUrl?: string;
  groupeNom: string;
  groupeCouleur: string;
}

// Interface interne pour un jour du calendrier
interface CalDay { day: number; today: boolean; }

// Interface pour les données mensuelles du bar chart
interface MonthData {
  label: string;
  segments: { statutId: number; label: string; count: number; pct: number }[];
}

// Interface pour la légende de la jauge
interface GaugeLegendItem { label: string; couleur: string; pct: number; }

@Component({
  selector: 'app-projet-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './projet-detail.component.html',
  styleUrls: ['./projet-detail.component.css']
})
export class ProjetDetailComponent implements OnInit, OnDestroy {

  // ── SERVICES ──
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private projetSvc   = inject(ProjetService);
  private activiteSvc = inject(ActiviteService);
  private commentSvc  = inject(CommentaireService);
  private nomencSvc   = inject(StatutActiviteService);
  private groupeSvc   = inject(GroupeService);
  private docSvc      = inject(DocumentService);
  private keycloak    = inject(KeycloakService);
  readonly ui         = inject(UiService);
  readonly perms      = inject(PermissionContextService);
  private notifSvc    = inject(NotificationService);
  private fb          = inject(FormBuilder);
  private subs        = new Subscription();

  // ── CONSTANTES ──
  readonly LINE_W = 300;
  readonly LINE_H = 90;
  readonly CAL_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  readonly PRIORITES = [
    { value: 1, label: 'Basse',   couleur: '#10b981' },
    { value: 2, label: 'Normale', couleur: '#3b82f6' },
    { value: 3, label: 'Haute',   couleur: '#f97316' },
    { value: 4, label: 'Urgente', couleur: '#ef4444' }
  ];

  readonly COULEURS = [
    '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
    '#eab308','#10b981','#06b6d4','#3b82f6','#64748b'
  ];

  // Couleurs et bordures pour le stacked bar chart (violet, bleu royal, cyan, vert...)
  private readonly CHART_COLORS  = ['#c026d3','#0d41f6','#00c2ff','#10b981','#f59e0b','#ef4444'];
  private readonly CHART_BORDERS = ['#4d2c93','#0d32b3','#047fb1','#0d9467','#d97706','#dc2626'];

  // ── DONNÉES ──
  projet          = signal<Projet | null>(null);
  activites       = signal<Activite[]>([]);
  commentaires    = signal<Commentaire[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);  // depuis nomenclature, jamais statique
  statutsProjet   = signal<StatutProjet[]>([]);
  typesProjet     = signal<TypeProjet[]>([]);
  tousGroupes     = signal<Groupe[]>([]);
  documents       = signal<DocModel[]>([]);
  typesDocument   = signal<TypeDocument[]>([]);

  // ── ÉTATS UI ──
  loading            = signal(true);
  loadingComments    = signal(false);
  loadingDocs        = signal(false);
  submittingActivite = signal(false);
  submittingComment  = signal(false);
  savingProjet       = signal(false);
  uploadingDoc       = signal(false);

  // ── DRAWERS ──
  drawerInfoOpen     = signal(false);   // Drawer infos projet
  actDrawerOpen      = signal(false);   // Drawer détail activité
  slideActOpen       = signal(false);   // Slide-over formulaire activité
  editingActId       = signal<number | null>(null);
  selectedActivite   = signal<Activite | null>(null);
  activiteCommentaires = signal<Commentaire[]>([]);
  activiteDocuments  = signal<DocModel[]>([]);
  loadingActComments = signal(false);
  loadingActDocs     = signal(false);
  actPanelTab        = signal<'commentaires' | 'documents'>('commentaires');

  // ── FILTRE PANEL ──
  filterPanelOpen = signal(false);

  // ── VUE ACTIVITÉS ──
  vueActivites = signal<VueActivites>('kanban');

  // ── FILTRES ──
  filtreSearch    = signal('');
  filtreStatutId  = signal<number | ''>('');
  filtreAssigneId = signal<number | ''>('');
  filtrePriorite  = signal<number | ''>('');
  filtreEcheance  = signal('');
  sortBy          = signal<'priorite' | 'echeance' | 'nom'>('priorite');

  // ── ÉDITION INLINE PROJET ──
  editingField      = signal<string | null>(null);
  editingFieldValue = signal<any>(null);

  // ── COMMENTAIRES ──
  nouveauCommentaire  = signal('');
  editingCommentId    = signal<number | null>(null);
  editContenu         = signal('');
  nouveauActComment   = signal('');
  editingActCommentId = signal<number | null>(null);
  editActContenu      = signal('');

  // ── DRAG & DROP KANBAN ──
  draggingActId    = signal<number | null>(null);
  dragOverStatutId = signal<number | null>(null);
  private draggingActivite: Activite | null = null;

  // ── PAGINATION TABLE ──
  actPage          = signal(1);
  readonly actPageSize = 10;

  // ── CALENDRIERS DROPDOWN ──
  chartCalendarOpen = signal(false);
  lineCalendarOpen  = signal(false);
  chartMonth        = signal(new Date());
  lineMonth         = signal(new Date());

  // ── UTILISATEUR COURANT ──
  currentUserKcId = '';
  currentUserNom  = '';

  // ── FORMULAIRE ACTIVITÉ ──
  actForm: FormGroup = this.fb.group({
    nom:             ['', Validators.required],
    description:     [''],
    couleur:         ['#6366f1'],
    statutActiviteId:[null],
    priorite:        [2],
    heuresEstimees:  [null],
    dateEcheance:    [null],
    estGlobale:      [false],
    visible:         [true],
    facturable:      [true],
    assigneGroupeId: [null],
    utilisateurId:   [null]
  });

  // ════════════════════════════════════════════════════════════
  // COMPUTED
  // ════════════════════════════════════════════════════════════

  /** Activités filtrées et triées */
  activitesFiltrees = computed(() => {
    let list = this.activites();
    const q = this.filtreSearch().toLowerCase();
    if (q) list = list.filter(a =>
      a.nom.toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q));
    if (this.filtreStatutId())
      list = list.filter(a => a.statutActiviteId === +this.filtreStatutId());
    if (this.filtreAssigneId())
      list = list.filter(a => a.utilisateurId === +this.filtreAssigneId());
    if (this.filtrePriorite())
      list = list.filter(a => a.priorite === +this.filtrePriorite());
    if (this.filtreEcheance())
      list = list.filter(a => a.dateEcheance && a.dateEcheance <= this.filtreEcheance());
    const s = this.sortBy();
    return [...list].sort((a, b) => {
      if (s === 'priorite') return (b.priorite || 0) - (a.priorite || 0);
      if (s === 'echeance') return (a.dateEcheance || '').localeCompare(b.dateEcheance || '');
      return a.nom.localeCompare(b.nom);
    });
  });

  /** Nombre de filtres actifs */
  activeFiltersCount = computed(() => {
    let n = 0;
    if (this.filtreStatutId())  n++;
    if (this.filtreAssigneId()) n++;
    if (this.filtrePriorite())  n++;
    if (this.filtreEcheance())  n++;
    if (this.filtreSearch())    n++;
    return n;
  });

  /** Activités regroupées par statut (pour Kanban) */
  activitesParStatut = computed(() =>
    this.statutsActivite().map(s => ({
      statut: s,
      items: this.activitesFiltrees().filter(a => a.statutActiviteId === s.id)
    }))
  );

  /** Stats par statut (pour KPI + badges) */
  statsActivites = computed(() =>
    this.statutsActivite()
      .map(s => ({ ...s, count: this.activites().filter(a => a.statutActiviteId === s.id).length }))
      .filter(s => s.count > 0)
  );

  /** Liste des assignés uniques */
  assignes = computed(() => {
    const seen = new Set<number>();
    return this.activites()
      .filter(a => a.utilisateurId && !seen.has(a.utilisateurId!) && seen.add(a.utilisateurId!))
      .map(a => ({ id: a.utilisateurId!, nom: a.utilisateurNomComplet || '' }));
  });

  /** Groupes du projet enrichis depuis tousGroupes */
  groupesProjet = computed(() => {
    const p = this.projet();
    if (!p?.groupes) return [];
    return p.groupes.map(g => {
      const full = this.tousGroupes().find(gr => gr.id === g.id);
      return full || g;
    });
  });

  /** True si le projet n'a qu'un seul groupe */
  singleGroupe = computed(() => (this.projet()?.groupes?.length ?? 0) === 1);

  /** Pagination — page courante */
  actTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.activitesFiltrees().length / this.actPageSize)));

  actPagesArr = computed(() =>
    Array.from({ length: this.actTotalPages() }, (_, i) => i + 1));

  pagedActivites = computed(() => {
    const s = (this.actPage() - 1) * this.actPageSize;
    return this.activitesFiltrees().slice(s, s + this.actPageSize);
  });

  /** Team leads — un par groupe assigné au projet */
  teamLeads = computed((): TeamLeadInfo[] => {
    const leads: TeamLeadInfo[] = [];
    const seen = new Set<number>();
    for (const g of this.groupesProjet()) {
      const fullG = this.tousGroupes().find(gr => gr.id === g.id);
      if (!fullG?.teamLeadId) continue;
      const lead = (fullG.membres as any[])?.find(m => m.id === fullG.teamLeadId);
      if (lead && !seen.has(lead.id)) {
        seen.add(lead.id);
        leads.push({
          id: lead.id,
          nomComplet: (lead.prenom || '') + ' ' + (lead.nom || ''),
          email: lead.email || '',
          photoUrl: lead.photoUrl,
          groupeNom: fullG.nom,
          groupeCouleur: fullG.couleur || '#6366f1'
        });
      }
    }
    return leads;
  });

  /** Jours du calendrier bar chart */
  chartCalDays = computed(() => this._buildCalDays(this.chartMonth()));

  /** Jours du calendrier line chart */
  lineCalDays = computed(() => this._buildCalDays(this.lineMonth()));

  // ════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.currentUserKcId = this.keycloak.getKeycloakUserId() || '';
    this.currentUserNom  = this.keycloak.getFullName() || '';

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/projets']); return; }

    if (!this.perms.canSeeAnyProject()) {
      this.ui.error('Accès refusé.');
      this.router.navigate(['/projets']);
      return;
    }

    // Statuts depuis nomenclature (jamais statique)
    this.nomencSvc.getStatutsActivite().subscribe({
      next: s => {
        this.statutsActivite.set(s);
        if (s.length) this.actForm.patchValue({ statutActiviteId: s[0].id });
      }
    });

    this.projetSvc.getStatutsProjet().subscribe({ next: d => this.statutsProjet.set(d) });
    this.projetSvc.getTypesProjet().subscribe({ next: d => this.typesProjet.set(d) });
    this.docSvc.getTypesDocument().subscribe({ next: d => this.typesDocument.set(d) });
    this.groupeSvc.getAll().subscribe({ next: g => this.tousGroupes.set(g) });

    this.projetSvc.getById(id).subscribe({
      next: p => {
        this.projet.set(p);
        this.loading.set(false);
        this.loadActivites(id);
        this.loadCommentaires(id);
        this.loadDocuments(id);
      },
      error: () => { this.ui.error('Projet non trouvé.'); this.router.navigate(['/projets']); }
    });

    this.subs.add(this.notifSvc.newNotification$.subscribe(n => {
      const t = String(n.type);
      const pid = this.projet()?.id;
      if (pid && t === 'PROJET_COMMENTAIRE' && n.ressourceId === pid) this.loadCommentaires(pid);
      if (t === 'ACTIVITE_COMMENTAIRE') {
        const sel = this.selectedActivite();
        if (sel && n.ressourceId === sel.id) this.loadActiviteCommentaires(sel.id);
      }
    }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  // ════════════════════════════════════════════════════════════
  // CHARGEMENT DONNÉES
  // ════════════════════════════════════════════════════════════

  loadActivites(projetId: number): void {
    if (!this.perms.canSeeAnyActivity()) return;
    this.activiteSvc.getByProjet(projetId).subscribe({
      next: a => this.activites.set(a), error: () => {}
    });
  }

  loadCommentaires(projetId: number): void {
    this.loadingComments.set(true);
    this.commentSvc.getByProjet(projetId).subscribe({
      next: c => { this.commentaires.set(c); this.loadingComments.set(false); },
      error: () => this.loadingComments.set(false)
    });
  }

  loadDocuments(projetId: number): void {
    this.loadingDocs.set(true);
    this.docSvc.getByProjet(projetId).subscribe({
      next: d => {
        this.documents.set(d.filter((x: DocModel) => x.statutDocumentCode !== 'SUPPRIME'));
        this.loadingDocs.set(false);
      },
      error: () => this.loadingDocs.set(false)
    });
  }

  loadActiviteCommentaires(id: number): void {
    this.loadingActComments.set(true);
    this.commentSvc.getByActivite(id).subscribe({
      next: c => { this.activiteCommentaires.set(c); this.loadingActComments.set(false); },
      error: () => this.loadingActComments.set(false)
    });
  }

  loadActiviteDocuments(id: number): void {
    this.loadingActDocs.set(true);
    this.docSvc.getByActivite(id).subscribe({
      next: d => {
        this.activiteDocuments.set(d.filter((x: DocModel) => x.statutDocumentCode !== 'SUPPRIME'));
        this.loadingActDocs.set(false);
      },
      error: () => this.loadingActDocs.set(false)
    });
  }

  // ════════════════════════════════════════════════════════════
  // DRAWERS & UI
  // ════════════════════════════════════════════════════════════

  toggleDrawer(): void { this.drawerInfoOpen.update(v => !v); }

  resetFilters(): void {
    this.filtreSearch.set('');
    this.filtreStatutId.set('');
    this.filtreAssigneId.set('');
    this.filtrePriorite.set('');
    this.filtreEcheance.set('');
  }

  // -- Méthodes sans arrow functions pour le template --

  /** Ouvre/ferme le calendrier du bar chart (remplace .update(v => !v)) */
  toggleChartCalendar(): void { this.chartCalendarOpen.set(!this.chartCalendarOpen()); }

  /** Ouvre/ferme le calendrier du line chart (remplace .update(v => !v)) */
  toggleLineCalendar(): void  { this.lineCalendarOpen.set(!this.lineCalendarOpen()); }

  /** Ouvre/ferme le filtre panel (remplace .update(v => !v)) */
  toggleFilterPanel(): void   { this.filterPanelOpen.set(!this.filterPanelOpen()); }

  /** Ferme explicitement le filtre panel */
  closeFilterPanel(): void    { this.filterPanelOpen.set(false); }

  /** Ferme tous les calendriers et panels */
  closeAll(): void {
    this.filterPanelOpen.set(false);
    this.chartCalendarOpen.set(false);
    this.lineCalendarOpen.set(false);
  }

  /** Active/désactive le statut dans le filtre (remplace set(id === ... ? '' : id)) */
  toggleFiltreStatut(id: number): void {
    this.filtreStatutId.set(this.filtreStatutId() === id ? '' : id);
  }

  // ════════════════════════════════════════════════════════════
  // ÉDITION INLINE PROJET
  // ════════════════════════════════════════════════════════════

  startEditField(field: string, currentValue: any): void {
    this.editingField.set(field);
    this.editingFieldValue.set(currentValue);
  }

  saveField(): void {
    const field = this.editingField();
    const val   = this.editingFieldValue();
    const p     = this.projet();
    if (!field || !p) { this.editingField.set(null); return; }
    this.projetSvc.update(p.id, { [field]: val } as any).subscribe({
      next: updated => { this.projet.set(updated); this.editingField.set(null); this.ui.success('Modifié ✅'); },
      error: () => { this.ui.error('Erreur.'); this.editingField.set(null); }
    });
  }

  cancelField(): void { this.editingField.set(null); }

  // ════════════════════════════════════════════════════════════
  // DRAWER ACTIVITÉ
  // ════════════════════════════════════════════════════════════

  openActDrawer(a: Activite, e: Event): void {
    e.stopPropagation();
    this.selectedActivite.set(a);
    this.actPanelTab.set('commentaires');
    this.actDrawerOpen.set(true);
    this.loadActiviteCommentaires(a.id);
    this.loadActiviteDocuments(a.id);
  }

  closeActDrawer(): void {
    this.actDrawerOpen.set(false);
    this.selectedActivite.set(null);
  }

  openEditActFromDrawer(a: Activite): void {
    this.actDrawerOpen.set(false);
    setTimeout(() => this.openEditAct(a, new MouseEvent('click')), 150);
  }

  setActPanelTab(tab: 'commentaires' | 'documents'): void {
    this.actPanelTab.set(tab);
  }

  // ════════════════════════════════════════════════════════════
  // CRUD ACTIVITÉS
  // ════════════════════════════════════════════════════════════

  openCreateAct(): void {
    if (!this.perms.canCreateActivity() && !this.perms.canEditAnyProject()) {
      this.ui.warning('Permission requise.'); return;
    }
    this.editingActId.set(null);
    const p = this.projet();
    const singleGid = p?.groupes?.length === 1 ? p.groupes[0].id : null;
    this.actForm.reset({
      nom: '', description: '', couleur: '#6366f1',
      statutActiviteId: this.statutsActivite()[0]?.id || null,
      priorite: 2, heuresEstimees: null, dateEcheance: null,
      estGlobale: false, visible: true, facturable: true,
      assigneGroupeId: singleGid, utilisateurId: null
    });
    this.slideActOpen.set(true);
  }

  openEditAct(a: Activite, e: Event): void {
    e.stopPropagation();
    if (!this.perms.canEditAnyActivity()) { this.ui.warning('Permission requise.'); return; }
    this.editingActId.set(a.id);
    this.actForm.patchValue({
      nom: a.nom, description: a.description || '', couleur: a.couleur || '#6366f1',
      statutActiviteId: a.statutActiviteId, priorite: a.priorite || 2,
      heuresEstimees: a.heuresEstimees || null, dateEcheance: a.dateEcheance || null,
      estGlobale: a.estGlobale || false, visible: a.visible, facturable: a.facturable,
      utilisateurId: a.utilisateurId || null,
      assigneGroupeId: (a.groupes && a.groupes.length > 0) ? a.groupes[0].id : null
    });
    this.slideActOpen.set(true);
  }

  closeSlideAct(): void { this.slideActOpen.set(false); }

  saveAct(): void {
    if (this.actForm.invalid) { this.actForm.markAllAsTouched(); return; }
    const raw = this.actForm.getRawValue();
    const body: ActiviteRequest = {
      nom: raw.nom, description: raw.description, couleur: raw.couleur,
      statutActiviteId: raw.statutActiviteId, priorite: raw.priorite,
      heuresEstimees: raw.heuresEstimees, dateEcheance: raw.dateEcheance,
      estGlobale: raw.estGlobale, visible: raw.visible, facturable: raw.facturable,
      utilisateurId: raw.utilisateurId || undefined,
      groupeIds: raw.assigneGroupeId ? [raw.assigneGroupeId] : undefined
    };
    const editId = this.editingActId();
    const p = this.projet();
    this.submittingActivite.set(true);

    if (editId) {
      this.activiteSvc.update(editId, body).subscribe({
        next: saved => {
          this.activites.update(l => l.map(a => a.id === saved.id ? saved : a));
          if (this.selectedActivite()?.id === saved.id) this.selectedActivite.set(saved);
          this.slideActOpen.set(false);
          this.submittingActivite.set(false);
          this.ui.success('Activité mise à jour ✅');
        },
        error: () => { this.submittingActivite.set(false); this.ui.error('Erreur.'); }
      });
    } else {
      this.activiteSvc.create(body).subscribe({
        next: newAct => {
          if (p) this.projetSvc.assignerActivites(p.id, [...this.activites().map(a => a.id), newAct.id]).subscribe();
          this.activites.update(l => [...l, newAct]);
          this.slideActOpen.set(false);
          this.submittingActivite.set(false);
          this.ui.success('Activité créée ✅');
        },
        error: () => { this.submittingActivite.set(false); this.ui.error('Erreur.'); }
      });
    }
  }

  deleteAct(a: Activite, e: Event): void {
    e.stopPropagation();
    if (!this.perms.canDeleteAllActivities()) { this.ui.warning('Permission requise.'); return; }
    this.ui.confirm({
      title: 'Supprimer', message: `Supprimer "${a.nom}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this.activiteSvc.delete(a.id).subscribe({
        next: () => {
          this.activites.update(l => l.filter(x => x.id !== a.id));
          if (this.selectedActivite()?.id === a.id) { this.selectedActivite.set(null); this.actDrawerOpen.set(false); }
          this.ui.success('Supprimée.');
        }
      })
    });
  }

  // ════════════════════════════════════════════════════════════
  // ASSIGNATION — groupe OU membres (désactivation mutuelle)
  // ════════════════════════════════════════════════════════════

  /** True si un groupe est sélectionné */
  hasGroupeSelected(): boolean { return !!this.actForm.get('assigneGroupeId')?.value; }

  /** True si un membre est sélectionné */
  hasMembresSelected(): boolean { return !!this.actForm.get('utilisateurId')?.value; }

  /** Quand le groupe change, vider le membre */
  onGroupeChange(): void {
    if (this.actForm.get('assigneGroupeId')?.value) {
      this.actForm.get('utilisateurId')!.setValue(null);
    }
  }

  /** Quand un membre est choisi, vider le groupe */
  onMembreChange(): void {
    if (this.actForm.get('utilisateurId')?.value) {
      this.actForm.get('assigneGroupeId')!.setValue(null);
    }
  }

  /** Tous les membres de tous les groupes du projet (sans doublon) */
  getTousMembresProjet(): any[] {
    const p = this.projet();
    if (!p?.groupes?.length) return [];
    const seen = new Set<number>();
    const result: any[] = [];
    for (const g of p.groupes) {
      const full = this.tousGroupes().find(gr => gr.id === g.id);
      for (const m of (full?.membres as any[]) || []) {
        if (!seen.has(m.id)) { seen.add(m.id); result.push(m); }
      }
    }
    return result;
  }

  /** Setter couleur activité (remplace actForm.get('couleur')!.setValue(c) dans template) */
  setCouleur(c: string): void { this.actForm.get('couleur')!.setValue(c); }

  /** Getter couleur activité */
  getCouleurActForm(): string { return this.actForm.get('couleur')?.value || '#6366f1'; }

  /** Getter estGlobale */
  getEstGlobale(): boolean { return !!this.actForm.get('estGlobale')?.value; }

  /** Toggle estGlobale */
  toggleEstGlobale(): void {
    this.actForm.get('estGlobale')!.setValue(!this.actForm.get('estGlobale')!.value);
  }

  /** Getter statutActiviteId */
  getStatutActiviteId(): any { return this.actForm.get('statutActiviteId')?.value; }

  /** Setter statutActiviteId */
  setStatutActiviteId(v: any): void { this.actForm.get('statutActiviteId')!.setValue(v); }

  /** Getter utilisateurId du form */
  getUtilisateurIdForm(): any { return this.actForm.get('utilisateurId')?.value; }

  // ════════════════════════════════════════════════════════════
  // DRAG & DROP KANBAN
  // ════════════════════════════════════════════════════════════

  onDragStart(event: DragEvent, a: Activite): void {
    this.draggingActivite = a;
    this.draggingActId.set(a.id);
    event.dataTransfer?.setData('text/plain', String(a.id));
  }
  onDragEnd(): void {
    this.draggingActivite = null;
    this.draggingActId.set(null);
    this.dragOverStatutId.set(null);
  }
  onDragOver(event: DragEvent): void { event.preventDefault(); event.dataTransfer!.dropEffect = 'move'; }
  onDragEnter(event: DragEvent, statutId: number): void { event.preventDefault(); this.dragOverStatutId.set(statutId); }
  onDragLeave(event: DragEvent): void {
    const rel = event.relatedTarget as HTMLElement | null;
    if (!rel || !(event.currentTarget as HTMLElement).contains(rel)) this.dragOverStatutId.set(null);
  }
  onDrop(event: DragEvent, statutId: number): void {
    event.preventDefault();
    const act = this.draggingActivite;
    if (!act || act.statutActiviteId === statutId) { this.onDragEnd(); return; }
    this.activites.update(l => l.map(a => a.id === act.id ? { ...a, statutActiviteId: statutId } : a));
    this.activiteSvc.changerStatut(act.id, statutId).subscribe({
      next: saved => this.activites.update(l => l.map(a => a.id === saved.id ? saved : a)),
      error: () => {
        this.activites.update(l => l.map(a => a.id === act.id ? { ...a, statutActiviteId: act.statutActiviteId } : a));
        this.ui.error('Erreur changement de statut.');
      }
    });
    this.onDragEnd();
  }

  // ════════════════════════════════════════════════════════════
  // COMMENTAIRES PROJET
  // ════════════════════════════════════════════════════════════

  submitComment(): void {
    if (!this.perms.canCommentAnyProject()) { this.ui.warning('Permission requise.'); return; }
    const contenu = this.nouveauCommentaire().trim();
    if (!contenu) return;
    const p = this.projet();
    if (!p) return;
    this.submittingComment.set(true);
    this.commentSvc.createForProjet(p.id, { contenu, auteurNom: this.currentUserNom }).subscribe({
      next: c => { this.commentaires.update(l => [c, ...l]); this.nouveauCommentaire.set(''); this.submittingComment.set(false); },
      error: (e: HttpErrorResponse) => { this.ui.error(e.error?.message || 'Erreur.'); this.submittingComment.set(false); }
    });
  }
  startEdit(c: Commentaire): void { this.editingCommentId.set(c.id); this.editContenu.set(c.contenu); }
  cancelEdit(): void { this.editingCommentId.set(null); }
  saveEdit(c: Commentaire): void {
    const contenu = this.editContenu().trim();
    if (!contenu) return;
    this.commentSvc.update(c.id, contenu).subscribe({
      next: u => { this.commentaires.update(l => l.map(x => x.id === c.id ? u : x)); this.editingCommentId.set(null); }
    });
  }
  deleteComment(c: Commentaire): void {
    this.ui.confirm({
      title: 'Supprimer', message: 'Supprimer ce commentaire ?', type: 'danger', confirmLabel: 'Supprimer',
      onConfirm: () => this.commentSvc.delete(c.id).subscribe({
        next: () => this.commentaires.update(l => l.filter(x => x.id !== c.id))
      })
    });
  }
  isOwn(c: Commentaire): boolean { return c.auteurKeycloakId === this.currentUserKcId; }

  // ════════════════════════════════════════════════════════════
  // COMMENTAIRES ACTIVITÉ
  // ════════════════════════════════════════════════════════════

  submitActComment(): void {
    const a = this.selectedActivite();
    if (!a) return;
    const contenu = this.nouveauActComment().trim();
    if (!contenu) return;
    this.commentSvc.createForActivite(a.id, { contenu, auteurNom: this.currentUserNom }).subscribe({
      next: c => {
        this.activiteCommentaires.update(l => [c, ...l]);
        this.nouveauActComment.set('');
        this.activites.update(l => l.map(x => x.id === a.id ? { ...x, nombreCommentaires: (x.nombreCommentaires || 0) + 1 } : x));
      },
      error: () => this.ui.error('Erreur.')
    });
  }
  startEditActComment(c: Commentaire): void { this.editingActCommentId.set(c.id); this.editActContenu.set(c.contenu); }
  cancelEditActComment(): void { this.editingActCommentId.set(null); }
  saveEditActComment(c: Commentaire): void {
    const contenu = this.editActContenu().trim();
    if (!contenu) return;
    this.commentSvc.update(c.id, contenu).subscribe({
      next: u => { this.activiteCommentaires.update(l => l.map(x => x.id === c.id ? u : x)); this.editingActCommentId.set(null); }
    });
  }
  deleteActComment(c: Commentaire): void {
    const a = this.selectedActivite();
    this.ui.confirm({
      title: 'Supprimer', message: 'Supprimer ce commentaire ?', type: 'danger', confirmLabel: 'Supprimer',
      onConfirm: () => this.commentSvc.delete(c.id).subscribe({
        next: () => {
          this.activiteCommentaires.update(l => l.filter(x => x.id !== c.id));
          if (a) this.activites.update(l => l.map(x => x.id === a.id ? { ...x, nombreCommentaires: Math.max(0, (x.nombreCommentaires || 1) - 1) } : x));
        }
      })
    });
  }

  // ════════════════════════════════════════════════════════════
  // DOCUMENTS
  // ════════════════════════════════════════════════════════════

  onFileSelected(event: Event, projetId?: number, activiteId?: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.uploadingDoc.set(true);
    this.docSvc.upload({ file, projetId, activiteId }).subscribe({
      next: (doc: DocModel) => {
        if (activiteId) {
          this.activiteDocuments.update(l => [...l, doc]);
          const a = this.selectedActivite();
          if (a) this.activites.update(l => l.map(x => x.id === activiteId ? { ...x, nombreDocuments: (x.nombreDocuments || 0) + 1 } : x));
        } else {
          this.documents.update(l => [...l, doc]);
        }
        this.uploadingDoc.set(false);
        this.ui.success('Fichier uploadé ✅');
        input.value = '';
      },
      error: (e: HttpErrorResponse) => { this.uploadingDoc.set(false); this.ui.error(e.error?.message || 'Erreur upload.'); }
    });
  }

  deleteDocument(doc: DocModel, fromActivite = false): void {
    this.ui.confirm({
      title: 'Supprimer', message: `Supprimer "${doc.nom}" ?`, type: 'danger', confirmLabel: 'Supprimer',
      onConfirm: () => this.docSvc.delete(doc.id).subscribe({
        next: () => {
          if (fromActivite) this.activiteDocuments.update(l => l.filter(x => x.id !== doc.id));
          else this.documents.update(l => l.filter(x => x.id !== doc.id));
          this.ui.success('Supprimé.');
        }
      })
    });
  }

  // ════════════════════════════════════════════════════════════
  // CALENDRIER
  // ════════════════════════════════════════════════════════════

  prevChartMonth(): void { const d = new Date(this.chartMonth()); d.setMonth(d.getMonth() - 1); this.chartMonth.set(d); }
  nextChartMonth(): void { const d = new Date(this.chartMonth()); d.setMonth(d.getMonth() + 1); this.chartMonth.set(d); }
  prevLineMonth():  void { const d = new Date(this.lineMonth());  d.setMonth(d.getMonth() - 1); this.lineMonth.set(d); }
  nextLineMonth():  void { const d = new Date(this.lineMonth());  d.setMonth(d.getMonth() + 1); this.lineMonth.set(d); }

  closeChartCalendar(): void { this.chartCalendarOpen.set(false); }
  closeLineCalendar():  void { this.lineCalendarOpen.set(false); }

  chartMonthLabel(): string { return this._fmtMonthLabel(this.chartMonth()); }
  lineMonthLabel():  string { return this._fmtMonthLabel(this.lineMonth()); }

  private _fmtMonthLabel(d: Date): string {
    const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return m[d.getMonth()] + ' ' + d.getFullYear();
  }

  private _buildCalDays(date: Date): CalDay[] {
    const y = date.getFullYear(), m = date.getMonth();
    const first = new Date(y, m, 1).getDay();
    const offset = first === 0 ? 6 : first - 1;
    const days = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const arr: CalDay[] = [];
    for (let i = 0; i < offset; i++) arr.push({ day: 0, today: false });
    for (let day = 1; day <= days; day++) {
      arr.push({ day, today: day === today.getDate() && m === today.getMonth() && y === today.getFullYear() });
    }
    return arr;
  }

  // ════════════════════════════════════════════════════════════
  // DASHBOARDS — STACKED BAR CHART
  // ════════════════════════════════════════════════════════════

  getYAxisLabels(): number[] {
    const max = Math.max(this.activites().length, 5);
    const step = Math.ceil(max / 4 / 5) * 5 || 5;
    const labels: number[] = [];
    for (let v = 0; v <= step * 4; v += step) labels.push(v);
    return labels.reverse();
  }

  getMonthlyData(): MonthData[] {
    const mois = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const y = this.chartMonth().getFullYear();
    const statuts = this.statutsActivite();
    const acts = this.activites();
    const yLabels = this.getYAxisLabels();
    const yMax = yLabels[yLabels.length - 1] || 1;  // min value (reversed) = max

    return mois.map((lbl, mi) => {
      const segments = statuts.map(s => {
        const count = acts.filter(a => {
          if (!a.dateCreation) return false;
          const dt = new Date(a.dateCreation);
          return dt.getFullYear() === y && dt.getMonth() === mi && a.statutActiviteId === s.id;
        }).length;
        return { statutId: s.id, label: s.libelle, count, pct: yMax > 0 ? (count / yMax) * 100 : 0 };
      }).filter(seg => seg.count > 0);
      return { label: lbl, segments };
    });
  }

  getStatutChartColor(_s: any, idx: number): string  { return this.CHART_COLORS[idx % this.CHART_COLORS.length]; }
  getStatutChartColorById(_id: number, idx: number): string { return this.CHART_COLORS[idx % this.CHART_COLORS.length]; }
  getStatutChartBorderById(_id: number, idx: number): string { return this.CHART_BORDERS[idx % this.CHART_BORDERS.length]; }

  // ════════════════════════════════════════════════════════════
  // DASHBOARDS — LINE CHART
  // ════════════════════════════════════════════════════════════

  getLineYLabels(): number[] { return this.getYAxisLabels(); }

  getLineXLabels2(): string[] {
    const d = this.lineMonth();
    const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][d.getMonth()];
    return [`${m}1`, `${m}8`, `${m}16`, `${m}24`, `${m}31`];
  }

  getLinePoints2(): { x: number; y: number }[] {
    const d = this.lineMonth();
    const y = d.getFullYear(), m = d.getMonth();
    const weeks = [1, 8, 16, 24, 31];
    const yLabels = this.getYAxisLabels();
    const yMax = yLabels[yLabels.length - 1] || 1;
    const counts = weeks.map((w, i) => {
      const end = i < weeks.length - 1 ? weeks[i + 1] - 1 : 31;
      return this.activites().filter(a => {
        if (!a.dateCreation) return false;
        const dt = new Date(a.dateCreation);
        return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() >= w && dt.getDate() <= end;
      }).length;
    });
    return weeks.map((_, i) => ({
      x: 10 + (i / (weeks.length - 1)) * (this.LINE_W - 20),
      y: this.LINE_H - 10 - (yMax > 0 ? (counts[i] / yMax) * (this.LINE_H - 20) : 0)
    }));
  }

  getLinePath2(): string {
    const pts = this.getLinePoints2();
    if (!pts.length) return '';
    return pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  }

  getLineAreaPath2(): string {
    const pts = this.getLinePoints2();
    if (!pts.length) return '';
    const line = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
    return `${line} L${pts[pts.length - 1].x},${this.LINE_H} L${pts[0].x},${this.LINE_H} Z`;
  }

  // ════════════════════════════════════════════════════════════
  // DASHBOARDS — JAUGE SEMI-CIRCULAIRE
  // ════════════════════════════════════════════════════════════

  getGaugeLegend(): GaugeLegendItem[] {
    const total = this.activites().length;
    const colors = ['#c026d3', '#0d41f6', '#00c2ff', '#10b981'];
    return this.PRIORITES.map((p, i) => ({
      label: p.label,
      couleur: colors[i] || p.couleur,
      pct: total > 0 ? Math.round((this.activites().filter(a => a.priorite === p.value).length / total) * 100) : 0
    })).sort((a, b) => b.pct - a.pct);
  }

  getGaugeDash(rankIndex: number, r: number): string {
    const sorted = [...this.PRIORITES]
      .map(p => ({ v: p.value, count: this.activites().filter(a => a.priorite === p.value).length }))
      .sort((a, b) => b.count - a.count);
    const item = sorted[rankIndex];
    if (!item) return '0 999';
    const total = this.activites().length;
    const arcLen = Math.PI * r;
    const fill = total > 0 ? (item.count / total) * arcLen : 0;
    return `${fill.toFixed(2)} 999`;
  }

  // ════════════════════════════════════════════════════════════
  // HELPERS KPI
  // ════════════════════════════════════════════════════════════

  countHautePriorite(): number {
    return this.activites().filter(a => a.priorite >= 3).length;
  }
  getCountByStatut(statutId: number): number {
    return this.activites().filter(a => a.statutActiviteId === statutId).length;
  }
  getBarPct(statutId: number): number {
    const t = this.activites().length;
    return t ? Math.round((this.getCountByStatut(statutId) / t) * 100) : 0;
  }
  getPctStatut(count: number): number {
    const t = this.activites().length;
    return t ? Math.round((count / t) * 100) : 0;
  }
  getPctPriorite(v: number): number {
    const t = this.activites().length;
    return t ? Math.round((this.activites().filter(a => a.priorite === v).length / t) * 100) : 0;
  }
  minVal(a: number, b: number): number { return Math.min(a, b); }

  // ════════════════════════════════════════════════════════════
  // HELPERS AFFICHAGE
  // ════════════════════════════════════════════════════════════

  getStatutActivite(id?: number): StatutActivite | undefined { return this.statutsActivite().find(s => s.id === id); }
  getStatutActiviteLibelle(id?: number): string { return this.getStatutActivite(id)?.libelle || '—'; }
  getStatutActiviteCouleur(id?: number): string { return this.getStatutActivite(id)?.couleur || '#94a3b8'; }
  getStatutProjetColor(id?: number): string { return this.statutsProjet().find(s => s.id === id)?.couleur || '#94a3b8'; }
  getStatutProjetLabel(id?: number): string  { return this.statutsProjet().find(s => s.id === id)?.libelle || '—'; }
  getTypeProjetLabel(id?: number): string    { return this.typesProjet().find(t => t.id === id)?.libelle || '—'; }
  getPriorite(v: number) { return this.PRIORITES.find(p => p.value === v); }

  getProgressPct(p?: number, e?: number): number {
    if (!e) return 0;
    return Math.min(100, Math.round(((p || 0) / e) * 100));
  }
  getProgressColor(pct: number): string {
    if (pct >= 100) return '#ef4444'; if (pct >= 80) return '#f59e0b'; return '#10b981';
  }
  getAvancementColor(pct: number): string {
    if (pct >= 100) return '#10b981'; if (pct >= 60) return '#3b82f6'; if (pct >= 30) return '#f97316'; return '#94a3b8';
  }
  getAvatarColor(name: string): string {
    const c = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#10b981','#06b6d4','#3b82f6'];
    return c[(name || '').charCodeAt(0) % c.length];
  }
  getInitiales(n: string): string {
    return (n || '').split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  }
  fmtDate(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(dt.getDate()).padStart(2, '0')} ${m[dt.getMonth()]} ${dt.getFullYear()}`;
  }
  fmtDateTime(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(dt.getDate()).padStart(2, '0')} ${m[dt.getMonth()]} ${dt.getFullYear()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  }
  fmtHeures(h?: number): string {
    if (!h || h <= 0) return '0h';
    const hr = Math.floor(h); const mn = Math.round((h - hr) * 60);
    return mn > 0 ? `${hr}h${String(mn).padStart(2, '0')}` : `${hr}h`;
  }
  formatSize(bytes?: number): string { return this.docSvc.formatSize(bytes); }
  getDocIconColor(mime?: string): string { return this.docSvc.getIconColor(mime); }
  getDocIconLabel(mime?: string): string { return this.docSvc.getIconLabel(mime); }
  goBack(): void { this.router.navigate(['/projets']); }


 
    // ════════════════════════════════════════════════════════════
  // DASHBOARDS — JAUGE CONCENTRIQUE (cercles complets)
  // ════════════════════════════════════════════════════════════

  /** Calcule stroke-dasharray pour un cercle complet
   *  index : 0=extérieur(violet), 1=bleu, 2=cyan, 3=vert(centre)
   *  radius : rayon du cercle
   */
  getGaugeDashFull(index: number, radius: number): string {
    const total = 2 * Math.PI * radius;     // circonférence complète
    const pct = this.getGaugePct(index);     // pourcentage à afficher (0-100)
    const visible = total * (pct / 100);     // longueur visible du trait
    return `${visible.toFixed(2)} ${total}`; // "visible total" → le reste est masqué
  }

  /** Calcule le pourcentage pour chaque anneau (par priorité)
   *  Retourne 0-100 selon la proportion d'activités
   */
  private getGaugePct(index: number): number {
    const total = this.activites().length;
    if (total === 0) return 0;
    
    // Trie les priorités par nombre d'activités décroissant
    const sorted = [...this.PRIORITES]
      .map(p => ({ 
        value: p.value, 
        count: this.activites().filter(a => a.priorite === p.value).length 
      }))
      .sort((a, b) => b.count - a.count);
    
    const item = sorted[index];
    if (!item) return 0;
    
    return Math.round((item.count / total) * 100);
  }

}