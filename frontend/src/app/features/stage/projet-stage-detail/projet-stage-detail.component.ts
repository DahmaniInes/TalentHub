import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import { ProjetService }            from '../../../services/projet.service';
import { ActiviteService }          from '../../../services/activite.service';
import { CommentaireService }        from '../../../services/commentaire.service';
import { StatutActiviteService }    from '../../../services/statutactivite.service';
import { GroupeService }            from '../../../services/groupe.service';
import { DocumentService }          from '../../../services/document.service';
import { KeycloakService }          from '../../../services/keycloak.service';
import { UiService }                from '../../../services/ui.service';
import { NotificationService }      from '../../../services/notification.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { UserService }              from '../../../services/user.service';
import { StagiaireService }         from '../../../services/stagiaire.service';
import { StageAngularService as StageDetailService } from '../../../services/stage.service';

import { Projet, ProjetRequest, StatutProjet, TypeProjet } from '../../../shared/models/projet.model';
import { Activite, ActiviteRequest }     from '../../../shared/models/activite.model';
import { Commentaire }                   from '../../../shared/models/commentaire.model';
import { StatutActivite }                from '../../../shared/models/statut-activite.model';
import { Groupe }                        from '../../../shared/models/groupe.model';
import { Utilisateur }                   from '../../../shared/models/utilisateur.model';
import { Document as DocModel, TypeDocument } from '../../../shared/models/document.model';
import { HttpErrorResponse }             from '@angular/common/http';
import { PrioriteActiviteService } from '../../../services/priorite-activite.service';
import { EvaluationActiviteService } from '../../../services/evaluation-activite.service';
import { EvaluationActivite, EvaluationsActiviteResponse, EvaluationResume } from '../../../shared/models/evaluationactivite.model';
import { PrioriteActivite }        from '../../../shared/models/priorite-activite.model';

type VueActivites = 'overview' | 'kanban' | 'liste' | 'timeline';

// Interface interne pour un jour du calendrier
interface CalDay { day: number; today: boolean; }

// Interface pour les données mensuelles du bar chart
interface MonthData {
  label: string;
  segments: { statutId: number; label: string; count: number; pct: number; statutIndex: number }[];
}

// Interface pour la légende de la jauge
interface GaugeLegendItem { label: string; couleur: string; ringCouleur: string; pct: number; }

// ✅ Inclut désormais les superviseurs du stagiaire (ProjetDTO.StagiaireMembreDTO.superviseurs)
interface SuperviseurInfo {
  id: number;
  nomComplet: string;
  email: string;
  photoUrl?: string;
  poste?: string;
}

interface StagiaireInfo {
  id: number;
  nomComplet: string;
  email: string;
  photoUrl?: string;
  superviseurs?: SuperviseurInfo[];
}

@Component({
  selector: 'app-projet-stage-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './projet-stage-detail.component.html',
  styleUrls: ['./projet-stage-detail.component.css']
})
export class ProjetStageDetailComponent implements OnInit, OnDestroy {

  // ── SERVICES ──
  private route       = inject(ActivatedRoute);
  private router      = inject(Router);
  private projetSvc   = inject(ProjetService);
  private activiteSvc = inject(ActiviteService);
  private commentSvc  = inject(CommentaireService);
  private evaluationSvc = inject(EvaluationActiviteService);
  private nomencSvc   = inject(StatutActiviteService);
  private groupeSvc   = inject(GroupeService);
  private docSvc      = inject(DocumentService);
  private keycloak    = inject(KeycloakService);
  readonly ui         = inject(UiService);
  private notifSvc    = inject(NotificationService);
  private prioriteSvc = inject(PrioriteActiviteService);
  private fb          = inject(FormBuilder);
  private subs        = new Subscription();

  // ✅ Réintroduits pour la vérification d'accès à cette page de détail.
  // Le reste de la page (actions CRUD activité/commentaire) n'est pas gardé par permission.
  readonly perms       = inject(PermissionContextService);
  readonly Math        = Math;
  private userSvc      = inject(UserService);
  private stagiaireSvc = inject(StagiaireService);
  // ✅ Appel direct pour GET /projets/{id}/superviseurs-stagiaires —
  // pas de modification de ProjetService (fichier non fourni), endpoint
  // appelé ici uniquement.
  private http = inject(HttpClient);
  private stageSvc      = inject(StageDetailService);

  // ✅ ID nomenclature statut_stage pour EN_COURS (confirmé en base)
  private readonly STATUT_STAGE_EN_COURS_ID = 2;

  // ── ACCÈS À LA PAGE ──
  accessDenied = signal(false);

  // ── CONSTANTES ──
  readonly LINE_W = 300;
  readonly LINE_H = 90;
  readonly CAL_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  readonly COULEURS = [
    '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
    '#eab308','#10b981','#06b6d4','#3b82f6','#64748b'
  ];

  private readonly CHART_COLORS  = ['var(--accent)','#0d41f6','#00c2ff','#10b981','#f59e0b','#ef4444'];
  private readonly CHART_BORDERS = ['#4d2c93',       '#0d32b3','#047fb1','#0d9467','#d97706','#dc2626'];

  getStatutChartColor(_s: any, idx: number): string  { return this.CHART_COLORS[idx % this.CHART_COLORS.length]; }
  getStatutChartColorById(_id: number, idx: number): string { return this.CHART_COLORS[idx % this.CHART_COLORS.length]; }
  getStatutChartBorderById(_id: number, idx: number): string { return this.CHART_BORDERS[idx % this.CHART_BORDERS.length]; }

  // ── DONNÉES ──
  projet          = signal<Projet | null>(null);
  activites       = signal<Activite[]>([]);
  commentaires    = signal<Commentaire[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);
  priorites = signal<PrioriteActivite[]>([]);
  ovTasksExpanded = signal(false);
  editingGroupes = signal(false);
  groupesSelectTemp = signal<number[]>([]);
  statutsProjet   = signal<StatutProjet[]>([]);
  typesProjet     = signal<TypeProjet[]>([]);
  tousGroupes     = signal<Groupe[]>([]);

  // ── GESTION STAGIAIRES & SUPERVISEURS (drawer Infos projet) ──
  // ✅ Visible/éditable uniquement si perms.canEditProjetStage() (INT_PROJ_EDIT).
  // L'ajout/retrait de superviseurs par stagiaire nécessite EN PLUS
  // perms.canAssignSupervisor() (INT_ADMIN_ASSIGN_SUPERVISOR).
  tousLesStagiaires   = signal<Utilisateur[]>([]);
  tousLesSuperviseurs = signal<Utilisateur[]>([]);
  editingStagiaires   = signal(false);
  stagiairesSelectTemp = signal<number[]>([]);
  savingStagiaires    = signal(false);
  // Stagiaire dont on édite actuellement les superviseurs (popup/inline)
  editingSuperviseursPourStagiaireId = signal<number | null>(null);
  superviseursSelectTemp = signal<number[]>([]);
  savingSuperviseurs  = signal(false);
  documents       = signal<DocModel[]>([]);

  // ✅ Map id-stagiaire → superviseurs, alimentée UNIQUEMENT si l'utilisateur
  // courant a INT_ADMIN_VIEW_ALL_INTERNS (seule permission qui autorise
  // GET /stagiaires côté backend). Sans cette permission (cas superviseur ou
  // stagiaire), la carte affiche les stagiaires sans la ligne superviseur —
  // pas de 403, juste une donnée absente. Ne modifie ni ProjetDTO ni
  // l'endpoint backend : un seul appel réutilisant StagiaireService.getAll(),
  // déjà utilisé ailleurs dans l'app pour ce même usage.
  private superviseursParStagiaireId = signal<Map<number, SuperviseurInfo[]>>(new Map());
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
  drawerInfoOpen     = signal(false);
  actDrawerOpen      = signal(false);
  slideActOpen       = signal(false);
  editingActId       = signal<number | null>(null);
  selectedActivite   = signal<Activite | null>(null);
  activiteCommentaires = signal<Commentaire[]>([]);
  activiteDocuments  = signal<DocModel[]>([]);
  loadingActComments = signal(false);
  loadingActDocs     = signal(false);
  actPanelTab        = signal<'commentaires' | 'documents' | 'evaluation'>('commentaires');

  // ── ÉVALUATION ACTIVITÉ (note 0-5 + commentaire, par superviseur) ──
  evaluationsActivite   = signal<EvaluationActivite[]>([]);
  moyenneEvaluation     = signal<number>(0);
  totalEvaluations      = signal<number>(0);
  loadingEvaluations    = signal(false);
  submittingEvaluation  = signal(false);
  // Formulaire d'évaluation de l'utilisateur courant pour l'activité affichée
  monEvaluationNote        = signal<number>(0);
  monEvaluationCommentaire = signal('');
  hoverStar                = signal<number>(0);

  // ✅ NOUVEAU — Résumé (moyenne+total) de toutes les activités du projet,
  // pour la colonne "Évaluation" de la table/kanban. Chargé en un seul
  // appel batch (pas un par activité).
  evaluationResumeMap = signal<Map<number, EvaluationResume>>(new Map());
  // Étoile en survol DANS la table/kanban (pas dans le drawer), par activité
  hoverStarListeActiviteId = signal<number | null>(null);
  hoverStarListeValue      = signal<number>(0);

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
  currentUserId: number | null = null;

  // ── FORMULAIRE ACTIVITÉ ──
  // ✅ estGlobale retiré (un projet de stage n'a pas d'activités globales/privées)
  // ✅ assigneGroupeId retiré (pas de notion de groupe pour les activités de stage)
  // ✅ utilisateurId retiré du FormGroup réactif — l'assignation se fait désormais
  //    via une sélection multi-stagiaires (signal stagiairesAssignesActForm),
  //    visible uniquement pour les superviseurs (INT_SUPER_CAN_SUPERVISE).
  actForm: FormGroup = this.fb.group({
    nom:             ['', Validators.required],
    description:     [''],
    couleur:         ['#6366f1'],
    statutActiviteId:[null],
    prioriteId:      [null],
    heuresEstimees:  [null],
    dateEcheance:    [null],
    visible:         [true],
    facturable:      [true]
  });

  // ✅ Sélection multi-stagiaires pour l'assignation d'une activité.
  // Alimentée depuis p.stagiaires (stagiaires déjà assignés au projet),
  // jamais via un appel API séparé.
  stagiairesActForm = signal<number[]>([]);

  // ════════════════════════════════════════════════════════════
  // COMPUTED
  // ════════════════════════════════════════════════════════════

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

  activeFiltersCount = computed(() => {
    let n = 0;
    if (this.filtreStatutId())  n++;
    if (this.filtreAssigneId()) n++;
    if (this.filtrePriorite())  n++;
    if (this.filtreEcheance())  n++;
    if (this.filtreSearch())    n++;
    return n;
  });

  activitesParStatut = computed(() =>
    this.statutsActivite().map(s => ({
      statut: s,
      items: this.activitesFiltrees().filter(a => a.statutActiviteId === s.id)
    }))
  );

  statsActivites = computed(() =>
    this.statutsActivite()
      .map(s => ({ ...s, count: this.activites().filter(a => a.statutActiviteId === s.id).length }))
      .filter(s => s.count > 0)
  );

  /** ✅ Pour les cartes KPI du haut — TOUS les statuts, même ceux à 0 activité */
  statutsKpiCards = computed(() =>
    this.statutsActivite()
      .map(s => ({ ...s, count: this.activites().filter(a => a.statutActiviteId === s.id).length }))
  );

  assignes = computed(() => {
    const seen = new Set<number>();
    return this.activites()
      .filter(a => a.utilisateurId && !seen.has(a.utilisateurId!) && seen.add(a.utilisateurId!))
      .map(a => ({ id: a.utilisateurId!, nom: a.utilisateurNomComplet || '' }));
  });

  groupesProjet = computed(() => {
    const p = this.projet();
    if (!p?.groupes) return [];
    return p.groupes.map(g => {
      const full = this.tousGroupes().find(gr => gr.id === g.id);
      return full || g;
    });
  });

  singleGroupe = computed(() => (this.projet()?.groupes?.length ?? 0) === 1);

  actTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.activitesFiltrees().length / this.actPageSize)));

  actPagesArr = computed(() =>
    Array.from({ length: this.actTotalPages() }, (_, i) => i + 1));

  pagedActivites = computed(() => {
    const s = (this.actPage() - 1) * this.actPageSize;
    return this.activitesFiltrees().slice(s, s + this.actPageSize);
  });

  /** ✅ Stagiaires assignés au projet, enrichis de leurs superviseurs si
   *  la map superviseursParStagiaireId a été chargée (admin uniquement). */
  stagiairesAssignes = computed((): StagiaireInfo[] => {
    const p = this.projet();
    if (!p?.stagiaires?.length) return [];
    const supMap = this.superviseursParStagiaireId();
    return p.stagiaires.map(s => ({
      id: s.id,
      nomComplet: s.nomComplet || '',
      email: s.email || '',
      photoUrl: s.photoUrl,
      superviseurs: supMap.get(s.id) || []
    }));
  });

  /** ✅ L'évaluation déjà déposée par l'utilisateur courant pour l'activité affichée, s'il y en a une */
  monEvaluationExistante = computed((): EvaluationActivite | null => {
    return this.evaluationsActivite().find(e => e.evaluateurKeycloakId === this.currentUserKcId) || null;
  });

  /** ✅ Évaluations des AUTRES superviseurs (pour affichage en lecture) */
  autresEvaluations = computed((): EvaluationActivite[] => {
    return this.evaluationsActivite().filter(e => e.evaluateurKeycloakId !== this.currentUserKcId);
  });

  /** Stagiaires de l'entreprise pas encore sélectionnés dans le formulaire d'édition */
  stagiairesDisponiblesPourAjout = computed(() => {
    const selectionnes = new Set(this.stagiairesSelectTemp());
    return this.tousLesStagiaires().filter(s => !selectionnes.has(s.id));
  });

  /** Superviseurs éligibles pas encore sélectionnés pour le stagiaire en cours d'édition */
  superviseursDisponiblesPourAjout = computed(() => {
    const selectionnes = new Set(this.superviseursSelectTemp());
    return this.tousLesSuperviseurs().filter(s => !selectionnes.has(s.id));
  });

  // ── CALENDRIER MOIS/ANNÉE ──
  chartYear    = signal<number>(new Date().getFullYear());
  chartMonthIdx = signal<number>(new Date().getMonth());
  lineYear     = signal<number>(new Date().getFullYear());
  lineMonthIdx = signal<number>(new Date().getMonth());

  chartShowYearPicker = signal(false);
  lineShowYearPicker  = signal(false);

  readonly MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  readonly MOIS_COMPLETS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  chartMonthLabel(): string {
    return this.MOIS_COMPLETS[this.chartMonthIdx()] + ' ' + this.chartYear();
  }
  lineMonthLabel(): string {
    return this.MOIS_COMPLETS[this.lineMonthIdx()] + ' ' + this.lineYear();
  }

  prevChartYear(): void { this.chartYear.update(y => y - 1); }
  nextChartYear(): void { this.chartYear.update(y => y + 1); }
  prevLineYear():  void { this.lineYear.update(y => y - 1); }
  nextLineYear():  void { this.lineYear.update(y => y + 1); }

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
    if (!id) { this.router.navigate(['/projets-stage']); return; }

    this.nomencSvc.getStatutsActivite().subscribe({
      next: s => {
        this.statutsActivite.set(s);
        if (s.length) this.actForm.patchValue({ statutActiviteId: s[0].id });
      }
    });

    this.prioriteSvc.getActives().subscribe({
      next: p => {
        this.priorites.set(p);
        const normale = p.find(pr => pr.code === 'NORMALE');
        if (normale) this.actForm.patchValue({ prioriteId: normale.id });
      }
    });

    this.projetSvc.getStatutsProjet().subscribe({ next: d => this.statutsProjet.set(d) });
    this.projetSvc.getTypesProjet().subscribe({ next: d => this.typesProjet.set(d) });
    this.docSvc.getTypesDocument().subscribe({ next: d => this.typesDocument.set(d) });
    this.groupeSvc.getAll().subscribe({ next: g => this.tousGroupes.set(g) });

    // ✅ Listes nécessaires à la gestion stagiaires/superviseurs du drawer —
    // chargées seulement si l'utilisateur peut éditer le projet, pour éviter
    // un appel (et un éventuel 403) inutile pour les autres profils.
    if (this.perms.canEditProjetStage()) {
      this.stagiaireSvc.getAll().subscribe({ next: d => this.tousLesStagiaires.set(d) });
      this.stagiaireSvc.getSuperviseurs().subscribe({ next: d => this.tousLesSuperviseurs.set(d) });
    }

    this.projetSvc.getById(id).subscribe({
      next: p => {
        this.projet.set(p);
        this.loadActivites(id);
        this.loadCommentaires(id);
        this.loadDocuments(id);
        this.chargerSuperviseursStagiaires(p);
        this.loadEvaluationsResumeProjet(id);
        // ✅ Vérification d'accès une fois le projet chargé (on a besoin de p.stagiaires)
        this.verifierAcces(p);
      },
      error: () => {
        this.ui.error('Projet non trouvé.');
        this.router.navigate(['/projets-stage']);
      }
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

  /**
   * Vérifie si l'utilisateur courant a le droit de voir cette page de détail :
   * - INT_ADMIN_PROJ_VIEW_ALL → accès total, aucune autre condition.
   * - INT_SUPER_TRACK → accès si l'utilisateur encadre (StagiaireService.getMes)
   *   au moins un des stagiaires du projet, ET que le stage lié à ce projet
   *   pour ce stagiaire est actif (statutStageId = EN_COURS = 2).
   * - INT_INTERN_VIEW_PROJ → accès si l'utilisateur lui-même est dans
   *   p.stagiaires ET que son stage lié à ce projet est actif.
   * Si aucune condition n'est remplie → accès refusé.
   */
  private verifierAcces(p: Projet): void {
    // ✅ On résout systématiquement currentUserId (utilisé pour l'ownership des
    // documents/commentaires propres), même pour un admin — mais sans jamais
    // bloquer son accès si cette résolution échoue.
    if (this.currentUserKcId) {
      this.userSvc.getUserByKeycloakId(this.currentUserKcId).subscribe({
        next: u => this.currentUserId = u.id,
        error: () => {}
      });
    }

    // ✅ Admin : accès total, pas besoin d'attendre la résolution ci-dessus
    if (this.perms.canViewAllProjetsStage()) {
      this.loading.set(false);
      return;
    }

    if (!this.currentUserKcId) {
      this.refuserAcces();
      return;
    }

    this.userSvc.getUserByKeycloakId(this.currentUserKcId).subscribe({
      next: u => {
        this.currentUserId = u.id;
        this.verifierAccesAvecUserId(p, u.id);
      },
      error: () => this.refuserAcces()
    });
  }

  private verifierAccesAvecUserId(p: Projet, userId: number): void {
    const stagiairesDuProjet = p.stagiaires || [];

    // ── Cas STAGIAIRE : l'utilisateur est lui-même assigné à ce projet ──
    if (this.perms.canViewMyProjet()) {
      const monEntree = stagiairesDuProjet.find(s => s.id === userId);
      if (monEntree?.stageId) {
        this.stageSvc.getById(monEntree.stageId).pipe(
            catchError(() => of(null))
        ).subscribe(stage => {
          if (stage && stage.statutStageId === this.STATUT_STAGE_EN_COURS_ID) {
            this.autoriserAcces();
          } else if (this.perms.can('INT_SUPER_TRACK')) {
            // L'utilisateur n'est pas (ou plus) un stagiaire actif sur ce projet,
            // mais il pourrait aussi être superviseur : on tente ce chemin avant de refuser.
            this.verifierAccesSuperviseur(p, userId, stagiairesDuProjet);
          } else {
            this.refuserAcces();
          }
        });
        return;
      }
    }

    // ── Cas SUPERVISEUR ──
    if (this.perms.can('INT_SUPER_TRACK')) {
      this.verifierAccesSuperviseur(p, userId, stagiairesDuProjet);
      return;
    }

    this.refuserAcces();
  }

  private verifierAccesSuperviseur(
      p: Projet, superviseurId: number, stagiairesDuProjet: NonNullable<Projet['stagiaires']>
  ): void {
    if (stagiairesDuProjet.length === 0) { this.refuserAcces(); return; }

    this.stagiaireSvc.getMes(superviseurId).pipe(
        catchError(() => of([]))
    ).subscribe(mesStagiaires => {
      const mesStagiaireIds = new Set(mesStagiaires.map(s => s.id));
      const stagiairesEncadresIciAvecStage = stagiairesDuProjet.filter(
          s => mesStagiaireIds.has(s.id) && s.stageId != null
      );

      if (stagiairesEncadresIciAvecStage.length === 0) { this.refuserAcces(); return; }

      // Vérifier que AU MOINS UN de ces stages est actif
      forkJoin(
          stagiairesEncadresIciAvecStage.map(s =>
              this.stageSvc.getById(s.stageId!).pipe(catchError(() => of(null)))
          )
      ).subscribe(stages => {
        const auMoinsUnActif = stages.some(
            st => st && st.statutStageId === this.STATUT_STAGE_EN_COURS_ID
        );
        if (auMoinsUnActif) this.autoriserAcces();
        else this.refuserAcces();
      });
    });
  }

  private autoriserAcces(): void {
    this.loading.set(false);
  }

  private refuserAcces(): void {
    this.accessDenied.set(true);
    this.loading.set(false);
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  // ════════════════════════════════════════════════════════════
  // CHARGEMENT DONNÉES
  // ════════════════════════════════════════════════════════════

  loadActivites(projetId: number): void {
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

  /**
   * ✅ Charge les superviseurs des stagiaires assignés à ce projet via le
   * nouvel endpoint GET /projets/{id}/superviseurs-stagiaires, gardé par
   * les MÊMES permissions que GET /projets/{id} (PROJECT_VIEW_*,
   * INT_ADMIN_PROJ_VIEW_ALL, INT_SUPER_TRACK, INT_INTERN_VIEW_PROJ).
   * N'exige PAS INT_ADMIN_VIEW_ALL_INTERNS : toute personne qui peut voir
   * cette page de détail projet peut voir ses stagiaires et superviseurs.
   * Ne modifie ni ProjetDTO ni Projet (modèle inchangé) — l'info est
   * récupérée à part et fusionnée côté frontend.
   */
  private chargerSuperviseursStagiaires(p: Projet): void {
    if (!p?.id) return;
    this.http.get<{ stagiaireId: number; superviseurs: SuperviseurInfo[] }[]>(
        `http://localhost:8085/api/application/projets/${p.id}/superviseurs-stagiaires`
    ).pipe(
        catchError(() => of([]))
    ).subscribe(rows => {
      const map = new Map<number, SuperviseurInfo[]>();
      rows.forEach(r => map.set(r.stagiaireId, r.superviseurs || []));
      this.superviseursParStagiaireId.set(map);
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

  // ════════════════════════════════════════════════════════════
  // GESTION STAGIAIRES DU PROJET (drawer Infos projet)
  // ════════════════════════════════════════════════════════════
  // ✅ Réservé à perms.canEditProjetStage() (INT_PROJ_EDIT) — vérifié aussi
  // côté HTML. Ajout/retrait libre parmi TOUS les stagiaires de l'entreprise.
  // Utilise directement les endpoints MembreEquipe (pas de service Angular
  // dédié fourni) : POST /membres-equipe/stagiaire et
  // DELETE /membres-equipe/projet/{projetId}/utilisateur/{userId}.

  private readonly membresEquipeApi = 'http://localhost:8085/api/application/membres-equipe';

  startEditStagiaires(): void {
    if (!this.perms.canEditProjetStage()) return;
    const p = this.projet();
    this.stagiairesSelectTemp.set((p?.stagiaires || []).map(s => s.id));
    this.editingStagiaires.set(true);
  }

  cancelEditStagiaires(): void { this.editingStagiaires.set(false); }

  isStagiaireProjetSelected(id: number): boolean {
    return this.stagiairesSelectTemp().includes(id);
  }

  toggleStagiaireProjetSelection(id: number): void {
    this.stagiairesSelectTemp.update(ids =>
        ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  saveStagiairesProjet(): void {
    const p = this.projet();
    if (!p) return;
    const idsSelectionnes = this.stagiairesSelectTemp();
    const idsOriginaux    = (p.stagiaires || []).map(s => s.id);

    const aAjouter = idsSelectionnes.filter(id => !idsOriginaux.includes(id));
    const aRetirer = idsOriginaux.filter(id => !idsSelectionnes.includes(id));

    if (aAjouter.length === 0 && aRetirer.length === 0) {
      this.editingStagiaires.set(false);
      return;
    }

    this.savingStagiaires.set(true);
    const appels = [
      ...aAjouter.map(stagId => this.http.post(`${this.membresEquipeApi}/stagiaire`,
          { projetId: p.id, utilisateurId: stagId })),
      ...aRetirer.map(stagId => this.http.delete(
          `${this.membresEquipeApi}/projet/${p.id}/utilisateur/${stagId}`))
    ];

    forkJoin(appels).pipe(catchError(() => of(null))).subscribe(() => {
      this.savingStagiaires.set(false);
      this.editingStagiaires.set(false);
      // Recharge le projet pour obtenir la liste de stagiaires à jour
      this.projetSvc.getById(p.id).subscribe({
        next: updated => {
          this.projet.set(updated);
          this.chargerSuperviseursStagiaires(updated);
          this.ui.success('Stagiaires mis à jour ✅');
        }
      });
    });
  }

  // ════════════════════════════════════════════════════════════
  // GESTION SUPERVISEURS PAR STAGIAIRE (drawer Infos projet)
  // ════════════════════════════════════════════════════════════
  // ✅ Réservé à perms.canEditProjetStage() ET perms.canAssignSupervisor()
  // (INT_PROJ_EDIT ET INT_ADMIN_ASSIGN_SUPERVISOR) — vérifié côté HTML.
  // assignerSuperviseurs() REMPLACE toute la liste pour ce stagiaire —
  // on initialise donc la sélection avec les superviseurs déjà connus.

  startEditSuperviseurs(stagiaire: StagiaireInfo): void {
    if (!this.perms.canEditProjetStage() || !this.perms.canAssignSupervisor()) return;
    this.editingSuperviseursPourStagiaireId.set(stagiaire.id);
    this.superviseursSelectTemp.set((stagiaire.superviseurs || []).map(s => s.id));
  }

  cancelEditSuperviseurs(): void { this.editingSuperviseursPourStagiaireId.set(null); }

  isSuperviseurSelected(id: number): boolean {
    return this.superviseursSelectTemp().includes(id);
  }

  toggleSuperviseurSelection(id: number): void {
    this.superviseursSelectTemp.update(ids =>
        ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  saveSuperviseursPourStagiaire(): void {
    const stagiaireId = this.editingSuperviseursPourStagiaireId();
    const p = this.projet();
    if (!stagiaireId || !p) return;

    this.savingSuperviseurs.set(true);
    this.stagiaireSvc.assignerSuperviseurs(stagiaireId, this.superviseursSelectTemp()).subscribe({
      next: () => {
        this.savingSuperviseurs.set(false);
        this.editingSuperviseursPourStagiaireId.set(null);
        this.chargerSuperviseursStagiaires(p);
        this.ui.success('Superviseurs mis à jour ✅');
      },
      error: () => { this.savingSuperviseurs.set(false); this.ui.error('Erreur lors de la mise à jour.'); }
    });
  }



  resetFilters(): void {
    this.filtreSearch.set('');
    this.filtreStatutId.set('');
    this.filtreAssigneId.set('');
    this.filtrePriorite.set('');
    this.filtreEcheance.set('');
  }

  toggleChartCalendar(): void { this.chartCalendarOpen.set(!this.chartCalendarOpen()); }
  toggleLineCalendar(): void  { this.lineCalendarOpen.set(!this.lineCalendarOpen()); }
  toggleFilterPanel(): void   { this.filterPanelOpen.set(!this.filterPanelOpen()); }
  closeFilterPanel(): void    { this.filterPanelOpen.set(false); }

  closeAll(): void {
    this.filterPanelOpen.set(false);
    this.chartCalendarOpen.set(false);
    this.lineCalendarOpen.set(false);
  }

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

    if (field === 'dateFin' && p.dateDebut && val && val < p.dateDebut) {
      this.ui.error('La date de fin doit être après la date de début.');
      return;
    }
    if (field === 'dateDebut' && p.dateFin && val && val > p.dateFin) {
      this.ui.error('La date de début doit être avant la date de fin.');
      return;
    }

    const body: ProjetRequest = {
      nom:                         p.nom,
      description:                 p.description,
      couleur:                     p.couleur,
      statutProjetId:              p.statutProjetId,
      // ✅ typeProjetId reste STAGE_ACADEMIQUE — jamais modifié via cette page
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
      [field]: val
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
    this.loadEvaluationsActivite(a.id);
  }

  editingActField      = signal<string | null>(null);
  editingActFieldValue = signal<any>(null);

  saveActField(): void {
    const field = this.editingActField();
    const val   = this.editingActFieldValue();
    const a     = this.selectedActivite();
    if (!field || !a) { this.editingActField.set(null); return; }

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
      [field]: val
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
    if (!this.perms.canEditActiviteStageNew()) {
      this.ui.warning('Permission INT_ACT_EDIT requise.');
      return;
    }
    this.actDrawerOpen.set(false);
    setTimeout(() => this.openEditAct(a, new MouseEvent('click')), 150);
  }

  setActPanelTab(tab: 'commentaires' | 'documents' | 'evaluation'): void {
    this.actPanelTab.set(tab);
  }

  // ════════════════════════════════════════════════════════════
  // ÉVALUATION ACTIVITÉ — note 0 à 5 + commentaire, par superviseur
  // ════════════════════════════════════════════════════════════
  // ✅ Lecture : accessible à quiconque a déjà accès au drawer (pas de
  // restriction supplémentaire — le stagiaire peut voir ses notes).
  // ✅ Écriture (noter/modifier/supprimer sa propre évaluation) : réservée
  // strictement à perms.canEvaluerActiviteStage() = INT_SUPER_EVALUATE
  // ET INT_SUPER_CAN_SUPERVISE ensemble.

  loadEvaluationsActivite(activiteId: number): void {
    this.loadingEvaluations.set(true);
    this.evaluationSvc.getByActivite(activiteId).subscribe({
      next: (res: EvaluationsActiviteResponse) => {
        this.evaluationsActivite.set(res.evaluations || []);
        this.moyenneEvaluation.set(res.moyenne || 0);
        this.totalEvaluations.set(res.total || 0);
        this.loadingEvaluations.set(false);

        // Pré-remplir le formulaire avec l'évaluation existante de l'utilisateur, s'il y en a une
        const mine = this.monEvaluationExistante();
        this.monEvaluationNote.set(mine?.note ?? 0);
        this.monEvaluationCommentaire.set(mine?.commentaire ?? '');
      },
      error: () => this.loadingEvaluations.set(false)
    });
  }

  /**
   * ✅ NOUVEAU — Charge le résumé d'évaluation (moyenne+total) de TOUTES
   * les activités du projet en un seul appel, pour la colonne "Évaluation"
   * de la table/kanban.
   */
  loadEvaluationsResumeProjet(projetId: number): void {
    this.evaluationSvc.getResumeByProjet(projetId).subscribe({
      next: (rows: EvaluationResume[]) => {
        const map = new Map<number, EvaluationResume>();
        rows.forEach(r => map.set(r.activiteId, r));
        this.evaluationResumeMap.set(map);
      },
      error: () => {}
    });
  }

  /** Moyenne d'évaluation d'une activité (0 si aucune note) — pour table/kanban */
  getMoyenneEvaluationActivite(activiteId: number): number {
    return this.evaluationResumeMap().get(activiteId)?.moyenne || 0;
  }

  /** Nombre total d'évaluations d'une activité — pour table/kanban */
  getTotalEvaluationsActivite(activiteId: number): number {
    return this.evaluationResumeMap().get(activiteId)?.total || 0;
  }

  setHoverStarListe(activiteId: number, n: number): void {
    this.hoverStarListeActiviteId.set(activiteId);
    this.hoverStarListeValue.set(n);
  }
  clearHoverStarListe(): void {
    this.hoverStarListeActiviteId.set(null);
    this.hoverStarListeValue.set(0);
  }
  getHoverStarListe(activiteId: number): number {
    return this.hoverStarListeActiviteId() === activiteId ? this.hoverStarListeValue() : 0;
  }

  /**
   * ✅ Notation directe depuis la table/kanban (sans ouvrir le drawer) —
   * réservée à perms.canEvaluerActiviteStage(). Upsert l'évaluation de
   * l'utilisateur courant pour cette activité, puis recharge le résumé
   * batch du projet pour mettre à jour l'affichage partout.
   */
  noterActiviteDepuisListe(a: Activite, note: number, e?: Event): void {
    if (e) e.stopPropagation();
    if (!this.perms.canEvaluerActiviteStage()) {
      this.ui.warning('Permissions INT_SUPER_EVALUATE et INT_SUPER_CAN_SUPERVISE requises.');
      return;
    }
    this.evaluationSvc.evaluer(a.id, { note, evaluateurNom: this.currentUserNom }).subscribe({
      next: () => {
        const p = this.projet();
        if (p) this.loadEvaluationsResumeProjet(p.id);
        if (this.selectedActivite()?.id === a.id) this.loadEvaluationsActivite(a.id);
        this.ui.success('Évaluation enregistrée ✅');
      },
      error: () => this.ui.error('Erreur lors de l\'enregistrement.')
    });
  }

  setHoverStar(n: number): void { this.hoverStar.set(n); }
  clearHoverStar(): void { this.hoverStar.set(0); }
  setMonEvaluationNote(n: number): void { this.monEvaluationNote.set(n); }

  submitEvaluation(): void {
    const a = this.selectedActivite();
    if (!a) return;
    if (!this.perms.canEvaluerActiviteStage()) {
      this.ui.warning('Permissions INT_SUPER_EVALUATE et INT_SUPER_CAN_SUPERVISE requises.');
      return;
    }
    const note = this.monEvaluationNote();
    if (note < 0 || note > 5) {
      this.ui.warning('La note doit être comprise entre 0 et 5.');
      return;
    }
    this.submittingEvaluation.set(true);
    this.evaluationSvc.evaluer(a.id, {
      note,
      commentaire: this.monEvaluationCommentaire().trim() || undefined,
      evaluateurNom: this.currentUserNom
    }).subscribe({
      next: () => {
        this.submittingEvaluation.set(false);
        this.ui.success('Évaluation enregistrée ✅');
        this.loadEvaluationsActivite(a.id);
      },
      error: () => { this.submittingEvaluation.set(false); this.ui.error('Erreur lors de l\'enregistrement.'); }
    });
  }

  deleteMonEvaluation(): void {
    const a = this.selectedActivite();
    if (!a) return;
    if (!this.perms.canEvaluerActiviteStage()) return;
    this.ui.confirm({
      title: 'Supprimer mon évaluation',
      message: 'Supprimer votre note et commentaire pour cette activité ?',
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this.evaluationSvc.supprimer(a.id).subscribe({
        next: () => {
          this.monEvaluationNote.set(0);
          this.monEvaluationCommentaire.set('');
          this.ui.success('Évaluation supprimée.');
          this.loadEvaluationsActivite(a.id);
        },
        error: () => this.ui.error('Erreur lors de la suppression.')
      })
    });
  }

  /** Tableau [1,2,3,4,5] pour générer les étoiles dans le template */
  readonly STARS = [1, 2, 3, 4, 5];

  // ════════════════════════════════════════════════════════════
  // CRUD ACTIVITÉS
  // ════════════════════════════════════════════════════════════

  openCreateAct(): void {
    if (!this.perms.canCreateActiviteStageNew()) {
      this.ui.warning('Permission INT_ACT_CREATE requise.');
      return;
    }
    this.editingActId.set(null);

    this.actForm.reset({
      nom: '', description: '', couleur: '#6366f1',
      statutActiviteId: this.statutsActivite()[0]?.id || null,
      prioriteId: this.priorites().find(p => p.code === 'NORMALE')?.id || null,
      heuresEstimees: null, dateEcheance: null,
      visible: true, facturable: true
    });

    // ✅ Si le créateur est lui-même un stagiaire assigné à ce projet (pas un
    // superviseur), il est automatiquement assigné à l'activité qu'il crée.
    // Les superviseurs créent souvent des activités pour d'autres — pas
    // d'auto-assignation dans leur cas, ils choisissent explicitement.
    const estStagiaireDuProjet = !this.perms.can('INT_SUPER_CAN_SUPERVISE')
        && this.currentUserId != null
        && this.stagiairesAssignes().some(s => s.id === this.currentUserId);
    this.stagiairesActForm.set(estStagiaireDuProjet ? [this.currentUserId!] : []);

    this.slideActOpen.set(true);
  }

  openEditAct(a: Activite, e: Event): void {
    e.stopPropagation();
    if (!this.perms.canEditActiviteStageNew()) {
      this.ui.warning('Permission INT_ACT_EDIT requise.');
      return;
    }
    this.editingActId.set(a.id);

    this.actForm.patchValue({
      nom: a.nom, description: a.description || '', couleur: a.couleur || '#6366f1',
      statutActiviteId: a.statutActiviteId,
      prioriteId: a.prioriteId || null,
      heuresEstimees: a.heuresEstimees || null, dateEcheance: a.dateEcheance || null,
      visible: a.visible, facturable: a.facturable
    });
    // ✅ Pré-remplit la sélection multi-stagiaires depuis l'activité existante
    const idsExistants = a.utilisateurs?.length
        ? a.utilisateurs.map(u => u.id)
        : (a.utilisateurId ? [a.utilisateurId] : []);
    this.stagiairesActForm.set(idsExistants);

    this.slideActOpen.set(true);
  }

  closeSlideAct(): void { this.slideActOpen.set(false); }

  saveAct(): void {
    if (this.actForm.invalid) { this.actForm.markAllAsTouched(); return; }
    const raw = this.actForm.getRawValue();
    const ids = this.stagiairesActForm();
    const body: ActiviteRequest = {
      nom: raw.nom, description: raw.description, couleur: raw.couleur,
      statutActiviteId: raw.statutActiviteId,
      prioriteId: raw.prioriteId || undefined,
      heuresEstimees: raw.heuresEstimees, dateEcheance: raw.dateEcheance,
      visible: raw.visible, facturable: raw.facturable,
      // ✅ Assignation multi-stagiaires : utilisateurId garde le premier
      // (compat backend/affichage liste), utilisateurIds porte la sélection complète.
      utilisateurId: ids.length > 0 ? ids[0] : undefined,
      utilisateurIds: ids.length > 0 ? ids : undefined
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
    if (!this.perms.canDeleteActiviteStageNew()) {
      this.ui.warning('Permission INT_ACT_DELETE requise.');
      return;
    }
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
  // ASSIGNATION — sélection multi-stagiaires (réservée au superviseur)
  // ════════════════════════════════════════════════════════════
  // ✅ Remplace l'ancien système groupe OU membre : un projet de stage n'a
  // pas de groupes/équipes à assigner. On choisit un ou plusieurs stagiaires
  // parmi ceux déjà assignés à ce projet (p.stagiaires), sans appel API
  // supplémentaire. La section entière n'est visible/éditable que pour les
  // utilisateurs ayant INT_SUPER_CAN_SUPERVISE (voir HTML).

  /** Stagiaires assignés à ce projet, disponibles pour l'assignation d'activité */
  stagiairesDispoActForm(): StagiaireInfo[] {
    return this.stagiairesAssignes();
  }

  isStagiaireActFormSelected(id: number): boolean {
    return this.stagiairesActForm().includes(id);
  }

  toggleStagiaireActForm(id: number): void {
    this.stagiairesActForm.update(ids =>
        ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  setCouleur(c: string): void { this.actForm.get('couleur')!.setValue(c); }
  getCouleurActForm(): string { return this.actForm.get('couleur')?.value || '#6366f1'; }
  getStatutActiviteId(): any { return this.actForm.get('statutActiviteId')?.value; }
  setStatutActiviteId(v: any): void { this.actForm.get('statutActiviteId')!.setValue(v); }

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
    if (!this.perms.canEditActiviteStageNew()) {
      this.ui.warning('Permission INT_ACT_EDIT requise.');
      this.onDragEnd();
      return;
    }
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

  /**
   * ✅ NOUVEAU — Vérifie si le document a été uploadé par l'utilisateur courant.
   * DocumentDTO n'expose que `utilisateurId` (numérique, pas de keycloakId) —
   * on compare donc avec currentUserId, résolu systématiquement dans
   * verifierAcces() peu importe le profil (admin compris).
   */
  isOwnDoc(doc: DocModel): boolean {
    return this.currentUserId != null && doc.utilisateurId === this.currentUserId;
  }

  // ════════════════════════════════════════════════════════════
  // COMMENTAIRES ACTIVITÉ
  // ════════════════════════════════════════════════════════════

  submitActComment(): void {
    const a = this.selectedActivite();
    if (!a) return;
    if (!this.perms.canCommentActiviteStage()) {
      this.ui.warning('Permission INT_ACT_COMMENT requise.');
      return;
    }
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
    if (!this.perms.canCommentActiviteStage()) {
      this.ui.warning('Permission INT_ACT_COMMENT requise.');
      return;
    }
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
    if (activiteId && !this.perms.canUploadDocActiviteStage()) {
      this.ui.warning('Permission INT_ACT_DOC_UPLOAD requise.');
      return;
    }
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
    if (fromActivite && !this.perms.canUploadDocActiviteStage()) {
      this.ui.warning('Permission INT_ACT_DOC_UPLOAD requise.');
      return;
    }
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

    if (total <= 5) {
      return [5, 4, 3, 2, 1, 0];
    }

    const step = Math.ceil(total / 10);

    const labels: number[] = [];
    for (let i = 5; i >= 0; i--) {
      labels.push(i * step);
    }
    return labels;
  }

  getLineYLabels(): number[] { return this.getYAxisLabels(); }

  getMonthlyData(): MonthData[] {
    const y = this.chartYear();
    const statuts = this.statutsActivite();
    const acts = this.activites();
    const yLabels = this.getYAxisLabels();
    const yMax = yLabels[0] || 1;

    return this.MOIS_LABELS.map((lbl, mi) => {
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
          statutIndex: si,
          pct: yMax > 0 ? (count / yMax) * 100 : 0
        };
      }).filter(seg => seg.count > 0);
      return { label: lbl, segments };
    });
  }

  // ════════════════════════════════════════════════════════════
  // DASHBOARDS — LINE CHART
  // ════════════════════════════════════════════════════════════

  getLinePoints2(): { x: number; y: number }[] {
    const y = this.lineYear();
    const m = this.lineMonthIdx();

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const nextM = m === 11 ? 0 : m + 1;
    const nextY = m === 11 ? y + 1 : y;
    const daysInNextMonth = new Date(nextY, nextM + 1, 0).getDate();

    const points: { label: string; year: number; month: number; day: number }[] = [];
    for (let d = 1; d <= daysInMonth; d += 8) {
      points.push({ label: `${this.MOIS_LABELS[m]}${d}`, year: y, month: m, day: d });
    }
    if (points[points.length - 1]?.day !== daysInMonth) {
      points.push({ label: `${this.MOIS_LABELS[m]}${daysInMonth}`, year: y, month: m, day: daysInMonth });
    }
    const halfNext = Math.floor(daysInNextMonth / 2);
    for (let d = 1; d <= halfNext; d += 8) {
      points.push({ label: `${this.MOIS_LABELS[nextM]}${d}`, year: nextY, month: nextM, day: d });
    }

    const yLabels = this.getYAxisLabels();
    const yMax = yLabels[0] || 1;

    const counts = points.map((pt, i) => {
      const start = i === 0 ? 1 : points[i - 1].day + 1;
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
  goBack(): void { this.router.navigate(['/projets-stage']); }

  // ════════════════════════════════════════════════════════════
  // DASHBOARDS — JAUGE CONCENTRIQUE (cercles complets)
  // ════════════════════════════════════════════════════════════

  getGaugeDashFull(index: number, radius: number): string {
    const total = 2 * Math.PI * radius;
    const pct = this.getGaugePct(index);
    const visible = total * (pct / 100);
    return `${visible.toFixed(2)} ${total}`;
  }

  private getPrioritesByCount(): { priorite: PrioriteActivite; count: number; terminées: number }[] {
    const STATUT_TERMINE_ID = 4;
    return [...this.priorites()]
      .map(p => ({
        priorite: p,
        count: this.activites().filter(a => a.prioriteId === p.id).length,
        terminées: this.activites().filter(a => a.prioriteId === p.id && a.statutActiviteId === STATUT_TERMINE_ID).length
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }

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

  groupesDisponibles(): any[] {
    const assignes = this.groupesSelectTemp();
    return this.tousGroupes().filter(g => !assignes.includes(g.id));
  }
  getRestUsersTooltip(users: any[]): string {
    return users.map(u => u.nomComplet).join(', ');
  }

  assigneMultiTemp = signal<number[]>([]);

  startEditActField(field: string, currentValue: any): void {
    if (!this.perms.canEditActiviteStageNew()) {
      this.ui.warning('Permission INT_ACT_EDIT requise.');
      return;
    }
    this.editingActField.set(field);
    this.editingActFieldValue.set(currentValue);
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
    if (!this.perms.canEditActiviteStageNew()) {
      this.ui.warning('Permission INT_ACT_EDIT requise.');
      return;
    }
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
      utilisateurIds: ids
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