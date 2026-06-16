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
import { PrioriteActiviteService } from '../../../services/priorite-activite.service';
import { PrioriteActivite }        from '../../../shared/models/priorite-activite.model';
type VueActivites = 'overview' | 'kanban' | 'liste' | 'timeline';

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
  segments: { statutId: number; label: string; count: number; pct: number; statutIndex: number }[];
}

// Interface pour la légende de la jauge
interface GaugeLegendItem { label: string; couleur: string; ringCouleur: string; pct: number; }

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
  private prioriteSvc = inject(PrioriteActiviteService);
  private fb          = inject(FormBuilder);
private subs        = new Subscription();

  // ── CONSTANTES ──
  readonly LINE_W = 300;
  readonly LINE_H = 90;
  readonly CAL_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];



  readonly COULEURS = [
    '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
    '#eab308','#10b981','#06b6d4','#3b82f6','#64748b'
  ];

  // Couleurs et bordures pour le stacked bar chart (violet, bleu royal, cyan, vert...)
// Les couleurs dans CHART_COLORS correspondent à l'ordre des statuts
// index 0 = primary = premier statut (base de la barre), etc.
// Les couleurs dans CHART_COLORS correspondent à l'ordre des statuts
// index 0 = primary = premier statut (base de la barre), etc.
private readonly CHART_COLORS  = ['var(--accent)','#0d41f6','#00c2ff','#10b981','#f59e0b','#ef4444'];
private readonly CHART_BORDERS = ['#4d2c93',       '#0d32b3','#047fb1','#0d9467','#d97706','#dc2626'];

// Méthodes par index de statut (pas par ID)
getStatutChartColor(_s: any, idx: number): string  { return this.CHART_COLORS[idx % this.CHART_COLORS.length]; }
getStatutChartColorById(_id: number, idx: number): string { return this.CHART_COLORS[idx % this.CHART_COLORS.length]; }
getStatutChartBorderById(_id: number, idx: number): string { return this.CHART_BORDERS[idx % this.CHART_BORDERS.length]; }
  // ── DONNÉES ──
  projet          = signal<Projet | null>(null);
  activites       = signal<Activite[]>([]);
  commentaires    = signal<Commentaire[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);  // depuis nomenclature, jamais statique
  priorites = signal<PrioriteActivite[]>([]);
  vueOverview = signal<'overview' | 'kanban' | 'liste' | 'timeline'>('kanban');
  ovTasksExpanded = signal(false);
  editingGroupes = signal(false);
groupesSelectTemp = signal<number[]>([]);
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

  // ── UTILISATEUR COURANT ──
  currentUserKcId = '';
  currentUserNom  = '';

  // ── FORMULAIRE ACTIVITÉ ──
  actForm: FormGroup = this.fb.group({
    nom:             ['', Validators.required],
    description:     [''],
    couleur:         ['#6366f1'],
    statutActiviteId:[null],
    prioriteId:      [null],        // ← était priorite: [2]
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
      list = list.filter(a => a.prioriteId === +this.filtrePriorite());
    if (this.filtreEcheance())
      list = list.filter(a => a.dateEcheance && a.dateEcheance <= this.filtreEcheance());
    const s = this.sortBy();
    return [...list].sort((a, b) => {
      if (s === 'priorite') return (b.prioriteId || 0) - (a.prioriteId || 0);
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

  // ── CALENDRIER MOIS/ANNÉE (nouveau) ──
chartYear    = signal<number>(new Date().getFullYear());
chartMonthIdx = signal<number>(new Date().getMonth()); // 0-11
lineYear     = signal<number>(new Date().getFullYear());
lineMonthIdx = signal<number>(new Date().getMonth());

chartShowYearPicker = signal(false);
lineShowYearPicker  = signal(false);

readonly MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
readonly MOIS_COMPLETS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// Labels boutons
chartMonthLabel(): string {
  return this.MOIS_COMPLETS[this.chartMonthIdx()] + ' ' + this.chartYear();
}
lineMonthLabel(): string {
  return this.MOIS_COMPLETS[this.lineMonthIdx()] + ' ' + this.lineYear();
}

// Navigation année
prevChartYear(): void { this.chartYear.update(y => y - 1); }
nextChartYear(): void { this.chartYear.update(y => y + 1); }
prevLineYear():  void { this.lineYear.update(y => y - 1); }
nextLineYear():  void { this.lineYear.update(y => y + 1); }

// Sélection mois
selectChartMonth(idx: number): void {
  this.chartMonthIdx.set(idx);
  this.chartCalendarOpen.set(false);
}
selectLineMonth(idx: number): void {
  this.lineMonthIdx.set(idx);
  this.lineCalendarOpen.set(false);
}

toggleChartYearPicker(): void { this.chartShowYearPicker.set(!this.chartShowYearPicker()); }
toggleLineYearPicker():  void { this.lineShowYearPicker.set(!this.lineShowYearPicker()); }
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
  
    // ← AJOUTER : charger les priorités depuis la nomenclature
    this.prioriteSvc.getActives().subscribe({
      next: p => {
        this.priorites.set(p);
        // Pré-sélectionner la priorité "NORMALE" par défaut si elle existe
        const normale = p.find(pr => pr.code === 'NORMALE');
        if (normale) this.actForm.patchValue({ prioriteId: normale.id });
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

// TS — remplacer loadActivites
// TS — loadActivites simplifié (plus besoin des appels getById)
loadActivites(projetId: number): void {
  if (!this.perms.canSeeAnyActivity()) return;
  this.activiteSvc.getByProjet(projetId).subscribe({
    next: acts => this.activites.set(acts),
    error: () => {}
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
  
    // Validation date : fin > début
    if (field === 'dateFin' && p.dateDebut && val && val < p.dateDebut) {
      this.ui.error('La date de fin doit être après la date de début.');
      return;
    }
    if (field === 'dateDebut' && p.dateFin && val && val > p.dateFin) {
      this.ui.error('La date de début doit être avant la date de fin.');
      return;
    }
  
    // Construire le body complet pour ne pas écraser les autres champs
    const body: ProjetRequest = {
      nom:                         p.nom,
      description:                 p.description,
      couleur:                     p.couleur,
      statutProjetId:              p.statutProjetId,
      typeProjetId:                p.typeProjetId,
      dateDebut:                   p.dateDebut,
      dateFin:                     p.dateFin,
      budgetPrevu:                 p.budgetPrevu,
      heuresEstimees:              p.heuresEstimees,
      typeBudget:                  p.typeBudget,
      seuilAlerteHoraire:          p.seuilAlerteHoraire,
      visible:                     p.visible,
      facturable:                  p.facturable,
      autoriserActivitesGlobales:  p.autoriserActivitesGlobales,
      avancement:                  p.avancement,
      groupeIds:                   p.groupes?.map(g => g.id),
      [field]: val   // ← écrase uniquement le champ modifié
    };
  
    this.projetSvc.update(p.id, body).subscribe({
      next: updated => {
        this.projet.set(updated);
        this.editingField.set(null);
        this.ui.success('Modifié ✅');
      },
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




  
  // ── ÉDITION INLINE ACTIVITÉ (dans le drawer) ──
editingActField      = signal<string | null>(null);
editingActFieldValue = signal<any>(null);

/*startEditActField(field: string, currentValue: any): void {
  this.editingActField.set(field);
  this.editingActFieldValue.set(currentValue);
}*/


saveActField(): void {
  const field = this.editingActField();
  const val   = this.editingActFieldValue();
  const a     = this.selectedActivite();
  if (!field || !a) { this.editingActField.set(null); return; }

  // Body complet pour ne pas écraser les autres champs
  const body: ActiviteRequest = {
    nom:              a.nom,
    description:      a.description,
    couleur:          a.couleur,
    statutActiviteId: a.statutActiviteId,
    prioriteId:       a.prioriteId,
    heuresEstimees:   a.heuresEstimees,
    heuresPassees:    a.heuresPassees,
    dateEcheance:     a.dateEcheance,
    estGlobale:       a.estGlobale,
    visible:          a.visible,
    facturable:       a.facturable,
    utilisateurId:    a.utilisateurId,
    groupeIds:        a.groupes?.map(g => g.id),
    [field]: val   // ← écrase uniquement le champ modifié
  };

  this.activiteSvc.update(a.id, body).subscribe({
    next: saved => {
      this.activites.update(l => l.map(x => x.id === saved.id ? saved : x));
      this.selectedActivite.set(saved);
      this.editingActField.set(null);
      this.ui.success('Modifié ✅');
    },
    error: () => { this.ui.error('Erreur.'); this.editingActField.set(null); }
  });
}

cancelActField(): void { this.editingActField.set(null); }


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
      prioriteId: this.priorites().find(p => p.code === 'NORMALE')?.id || null,
      heuresEstimees: null, dateEcheance: null,
      estGlobale: false, visible: true, facturable: true,
      assigneGroupeId: singleGid, utilisateurId: null
    });

    this.slideActOpen.set(true);
  }

  openEditAct(a: Activite, e: Event): void {
    e.stopPropagation();
    if (!this.perms.canEditAnyActivity()) { this.ui.warning('Permission requise.'); return; }
    this.editingActId.set(a.id);
    
  // APRÈS :
  this.actForm.patchValue({
    nom: a.nom, description: a.description || '', couleur: a.couleur || '#6366f1',
    statutActiviteId: a.statutActiviteId,
    prioriteId: a.prioriteId || null,          // ← était priorite: a.priorite || 2
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
      statutActiviteId: raw.statutActiviteId,
      prioriteId: raw.prioriteId || undefined,   // ← était priorite: raw.priorite
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

  
  private _fmtMonthLabel(d: Date): string {
    const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return m[d.getMonth()] + ' ' + d.getFullYear();
  }

  closeChartCalendar(): void { this.chartCalendarOpen.set(false); }
  closeLineCalendar():  void { this.lineCalendarOpen.set(false); }

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
    const total = this.activites().length;
    
    // Si moins de 5 activités : plafonner à 5 et afficher 0,1,2,3,4,5
    if (total <= 5) {
      return [5, 4, 3, 2, 1, 0];
    }
    
    // Sinon : plafonner au nombre total d'activités, 5 paliers
    const step = Math.ceil(total / 10);
    
    const labels: number[] = [];
    for (let i = 5; i >= 0; i--) {
      labels.push(i * step);
    }
    return labels;
  }
  


  
  // Même méthode pour le line chart
  getLineYLabels(): number[] { return this.getYAxisLabels(); }





getMonthlyData(): MonthData[] {
  const y = this.chartYear();
  // on filtre par année choisie, mais on affiche les 12 mois
  const statuts = this.statutsActivite();
  const acts = this.activites();
  const yLabels = this.getYAxisLabels();
  const yMax = yLabels[0] || 1;

  return this.MOIS_LABELS.map((lbl, mi) => {



   // Dans getMonthlyData(), modifier la construction des segments :
const segments = statuts.map((s, si) => {
  const count = acts.filter(a => {
    if (!a.dateCreation) return false;
    const dt = new Date(a.dateCreation);
    return dt.getFullYear() === y && dt.getMonth() === mi && a.statutActiviteId === s.id;
  }).length;
  return {
    statutId: s.id,
    label: s.libelle,
    count,
    statutIndex: si,  // ← INDEX ORIGINAL conservé pour la couleur
    pct: yMax > 0 ? (count / yMax) * 100 : 0
  };
}).filter(seg => seg.count > 0);
    return { label: lbl, segments };
  });
}






  
  // ════════════════════════════════════════════════════════════
  // DASHBOARDS — LINE CHART
  // ════════════════════════════════════════════════════════════


  




// Remplacer getLinePoints2() :
getLinePoints2(): { x: number; y: number }[] {
  const y = this.lineYear();
  const m = this.lineMonthIdx();

  // Générer les points sur 1.5 mois : mois courant + moitié du mois suivant
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const nextM = m === 11 ? 0 : m + 1;
  const nextY = m === 11 ? y + 1 : y;
  const daysInNextMonth = new Date(nextY, nextM + 1, 0).getDate();

  // Points : semaines du mois courant (par 8) + début du mois suivant
  const points: { label: string; year: number; month: number; day: number }[] = [];
  for (let d = 1; d <= daysInMonth; d += 8) {
    points.push({ label: `${this.MOIS_LABELS[m]}${d}`, year: y, month: m, day: d });
  }
  // Ajouter le dernier jour du mois courant s'il n'est pas déjà là
  if (points[points.length - 1]?.day !== daysInMonth) {
    points.push({ label: `${this.MOIS_LABELS[m]}${daysInMonth}`, year: y, month: m, day: daysInMonth });
  }
  // Ajouter les points du mois suivant (par 8 jusqu'à la moitié)
  const halfNext = Math.floor(daysInNextMonth / 2);
  for (let d = 1; d <= halfNext; d += 8) {
    points.push({ label: `${this.MOIS_LABELS[nextM]}${d}`, year: nextY, month: nextM, day: d });
  }

  const yLabels = this.getYAxisLabels();
  const yMax = yLabels[0] || 1;

  // Compter les activités TERMINÉES (statutActiviteId === 4) par période
  const counts = points.map((pt, i) => {
    const start = i === 0 ? 1 : points[i - 1].day + 1;
    // pour simplifier : compter les activités terminées dont dateCreation est dans cette période
    return this.activites().filter(a => {
      if (a.statutActiviteId !== 4) return false;
      if (!a.dateCreation) return false;
      const dt = new Date(a.dateCreation);
      return dt.getFullYear() === pt.year &&
             dt.getMonth() === pt.month &&
             dt.getDate() >= start &&
             dt.getDate() <= pt.day;
    }).length;
  });

  return points.map((_, i) => ({
    x: 10 + (i / Math.max(points.length - 1, 1)) * (this.LINE_W - 20),
    y: this.LINE_H - 10 - (yMax > 0 ? (counts[i] / yMax) * (this.LINE_H - 20) : 0)
  }));
}

// Remplacer getLineXLabels2() :
getLineXLabels2(): string[] {
  const m = this.lineMonthIdx();
  const y = this.lineYear();
  const nextM = m === 11 ? 0 : m + 1;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const labels: string[] = [];
  for (let d = 1; d <= daysInMonth; d += 8) {
    labels.push(`${this.MOIS_LABELS[m]}${d}`);
  }
  if (labels[labels.length - 1] !== `${this.MOIS_LABELS[m]}${daysInMonth}`) {
    labels.push(`${this.MOIS_LABELS[m]}${daysInMonth}`);
  }
  const halfNext = Math.floor(new Date(m === 11 ? y + 1 : y, nextM + 1, 0).getDate() / 2);
  for (let d = 1; d <= halfNext; d += 8) {
    labels.push(`${this.MOIS_LABELS[nextM]}${d}`);
  }
  return labels;
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

   readonly GAUGE_COLORS = [
    { colorClass: 'pd5-color-primary',     hex: 'var(--accent)' },
    { colorClass: 'pd5-color-secondary',   hex: '#0d41f6'       },
    { colorClass: 'pd5-color-tertiary',    hex: '#00c2ff'       },
    { colorClass: 'pd5-color-quaternary',  hex: '#10b981'       },
    { colorClass: 'pd5-color-quinary',     hex: '#f59e0b'       },
    { colorClass: 'pd5-color-senary',      hex: '#ef4444'       },
  ];



  getGaugeLegend(): GaugeLegendItem[] {
    const items = this.getPrioritesByCount();
    const total = this.activites().length;
    
    return items.map((item, i) => ({
      label: item.priorite.libelle,
      couleur: item.priorite.couleur,
      ringCouleur: this.GAUGE_COLORS[i % this.GAUGE_COLORS.length].hex,
      pct: total > 0 ? Math.round((item.count / total) * 100) : 0
    }));
  }
  
  



  getGaugeDash(rankIndex: number, r: number): string {
    const sorted = [...this.priorites()]
      .map(p => ({ id: p.id, count: this.activites().filter(a => a.prioriteId === p.id).length }))
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
    const highIds = this.priorites()
      .filter(p => ['HAUTE', 'URGENTE'].includes(p.code))
      .map(p => p.id);
    return this.activites().filter(a => highIds.includes(a.prioriteId || 0)).length;
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


   getPctPriorite(id: number): number {
    const t = this.activites().length;
    return t ? Math.round((this.activites().filter(a => a.prioriteId === id).length / t) * 100) : 0;
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
  getPriorite(id?: number): PrioriteActivite | undefined {
    if (!id) return undefined;
    return this.priorites().find(p => p.id === id);
  }
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


getGaugeDashFull(index: number, radius: number): string {
  const total = 2 * Math.PI * radius;
  const pct = this.getGaugePct(index);
  const visible = total * (pct / 100);
  return `${visible.toFixed(2)} ${total}`;
}

// Retourne les priorités qui ont au moins 1 activité, triées par count décroissant
private getPrioritesByCount(): { priorite: PrioriteActivite; count: number; terminées: number }[] {
  const STATUT_TERMINE_ID = 4; // ID du statut "Terminé" en BD
  return [...this.priorites()]
    .map(p => ({
      priorite: p,
      count: this.activites().filter(a => a.prioriteId === p.id).length,
      terminées: this.activites().filter(a => a.prioriteId === p.id && a.statutActiviteId === STATUT_TERMINE_ID).length
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

// Taux de complétion : terminées / total pour cette priorité (dénominateur indépendant)
getGaugePct(index: number): number {
  const items = this.getPrioritesByCount();
  const item = items[index];
  if (!item || item.count === 0) return 0;
  return Math.round((item.terminées / item.count) * 100);
}



getGaugeRings(): { r: number; colorClass: string; count: number; label: string; terminées: number }[] {
  const items = this.getPrioritesByCount();
  if (items.length === 0) return [];
  const outerR = 84;
  const STEP = 12;
  const minInnerR = outerR - (items.length - 1) * STEP;
  const effectiveOuterR = minInnerR < 15 ? outerR + (15 - minInnerR) : outerR;
  return items.map((item, i) => ({
    r: effectiveOuterR - i * STEP,
    colorClass: this.GAUGE_COLORS[i % this.GAUGE_COLORS.length].colorClass,
    count: item.count,
    terminées: item.terminées,
    label: item.priorite.libelle
  }));
}

/** Nombre de membres distincts dans tous les groupes du projet */
getNombreMembresDistincts(): number {
  const seen = new Set<number>();
  for (const g of this.groupesProjet()) {
    const full = this.tousGroupes().find(gr => gr.id === g.id);
    for (const m of (full?.membres as any[]) || []) {
      seen.add(m.id);
    }
  }
  return seen.size;
}


  /** Calcule le pourcentage pour chaque anneau (par priorité)
   *  Retourne 0-100 selon la proportion d'activités
   */
 // APRÈS : index correspond directement à l'ordre des priorites() (pas de sort)
 





// AVANT (distance irrégulière, ordre non garanti) :
// APRÈS — distance fixe de 13px, couleurs toujours en ordre primary→secondary→...



/** Activités modifiées cette semaine */
getActivitesRecentWeek(): Activite[] {
  const now  = new Date();
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return this.activites()
    .filter(a => a.dateMiseAJour && new Date(a.dateMiseAJour) >= week)
    .slice(0, 8);
}

/** Nombre de jours depuis dateDebut */
getNombreJours(): number {
  const p = this.projet();
  if (!p?.dateDebut) return 0;
  const debut = new Date(p.dateDebut);
  const fin   = p.dateFin ? new Date(p.dateFin) : new Date();
  return Math.max(0, Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)));
}


getYearRange(): number[] {
  const current = new Date().getFullYear();
  const result: number[] = [];
  for (let y = current - 3; y <= current + 2; y++) result.push(y);
  return result;
}

getActivitesFiltreesOverview(): Activite[] {
  const all = this.getActivitesRecentWeek();
  return this.ovTasksExpanded() ? all : all.slice(0, 6);
}
toggleOvTasks(): void { this.ovTasksExpanded.update(v => !v); }




startEditGroupes(p: any): void {
  this.groupesSelectTemp.set(p.groupes?.map((g: any) => g.id) || []);
  this.editingGroupes.set(true);
}
removeGroupeTemp(id: number): void {
  this.groupesSelectTemp.update(ids => ids.filter(i => i !== id));
}
addGroupeTemp(id: number): void {
  if (!this.groupesSelectTemp().includes(id))
    this.groupesSelectTemp.update(ids => [...ids, id]);
}
saveGroupes(): void {
  const p = this.projet();
  if (!p) return;
  const body: any = {
    nom: p.nom, statutProjetId: p.statutProjetId,
    dateDebut: p.dateDebut, dateFin: p.dateFin,
    groupeIds: this.groupesSelectTemp()
  };
  this.projetSvc.update(p.id, body).subscribe({
    next: updated => {
      this.projet.set(updated);
      this.editingGroupes.set(false);
      this.ui.success('Équipes mises à jour ✅');
    },
    error: () => this.ui.error('Erreur.')
  });
}
cancelEditGroupes(): void { this.editingGroupes.set(false); }

// Groupes non encore assignés au projet
groupesDisponibles(): any[] {
  const assignes = this.groupesSelectTemp();
  return this.tousGroupes().filter(g => !assignes.includes(g.id));
}
getRestUsersTooltip(users: any[]): string {
  return users.map(u => u.nomComplet).join(', ');
}

// Signal temporaire pour l'édition multi
assigneMultiTemp = signal<number[]>([]);

startEditActField(field: string, currentValue: any): void {
  this.editingActField.set(field);
  this.editingActFieldValue.set(currentValue);
  // Si on édite l'assignation, initialiser le multi-select
  if (field === 'utilisateurId') {
    const a = this.selectedActivite();
    const ids = a?.utilisateurs?.map(u => u.id) || 
                (a?.utilisateurId ? [a.utilisateurId] : []);
    this.assigneMultiTemp.set(ids);
  }
}

isAssigneMulti(id: number): boolean {
  return this.assigneMultiTemp().includes(id);
}

toggleAssigneMulti(id: number): void {
  this.assigneMultiTemp.update(ids =>
    ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]
  );
}

saveActFieldMulti(): void {
  const a = this.selectedActivite();
  if (!a) return;
  const ids = this.assigneMultiTemp();
  const body: ActiviteRequest = {
    nom: a.nom, description: a.description, couleur: a.couleur,
    statutActiviteId: a.statutActiviteId, prioriteId: a.prioriteId,
    heuresEstimees: a.heuresEstimees, heuresPassees: a.heuresPassees,
    dateEcheance: a.dateEcheance, estGlobale: a.estGlobale,
    visible: a.visible, facturable: a.facturable,
    utilisateurId: ids.length > 0 ? ids[0] : undefined,
    utilisateurIds: ids,
    groupeIds: a.groupes?.map(g => g.id)
  };
  this.activiteSvc.update(a.id, body).subscribe({
    next: saved => {
      this.activites.update(l => l.map(x => x.id === saved.id ? saved : x));
      this.selectedActivite.set(saved);
      this.editingActField.set(null);
      this.ui.success('Modifié ✅');
    },
    error: () => { this.ui.error('Erreur.'); this.editingActField.set(null); }
  });
}

}