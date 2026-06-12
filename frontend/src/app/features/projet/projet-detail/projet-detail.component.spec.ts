import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProjetService }          from '../../../services/projet.service';
import { ActiviteService }        from '../../../services/activite.service';
import { CommentaireService }     from '../../../services/commentaire.service';
import { StatutActiviteService }  from '../../../services/statutactivite.service';
import { GroupeService }          from '../../../services/groupe.service';
import { KeycloakService }        from '../../../services/keycloak.service';
import { UiService }              from '../../../services/ui.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { NotificationService }    from '../../../services/notification.service';

import { Projet, ProjetRequest, StatutProjet, TypeProjet } from '../../../shared/models/projet.model';
import { Activite, ActiviteRequest }  from '../../../shared/models/activite.model';
import { Commentaire }                from '../../../shared/models/commentaire.model';
import { StatutActivite }             from '../../../shared/models/statut-activite.model';
import { Groupe }                     from '../../../shared/models/groupe.model';
import { HttpErrorResponse }          from '@angular/common/http';

/** Vue sélectionnée pour afficher les activités */
type VueActivites = 'kanban' | 'liste' | 'timeline';

@Component({
  selector: 'app-projet-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './projet-detail.component.html',
  styleUrls: ['./projet-detail.component.css']
})
export class ProjetDetailComponent implements OnInit, OnDestroy {

  // ── Services injectés ──
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private projetSvc    = inject(ProjetService);
  private activiteSvc  = inject(ActiviteService);
  private commentSvc   = inject(CommentaireService);
  private nomencSvc    = inject(StatutActiviteService);
  private groupeSvc    = inject(GroupeService);
  private keycloak     = inject(KeycloakService);
  readonly ui          = inject(UiService);
  readonly perms       = inject(PermissionContextService);
  private notifSvc     = inject(NotificationService);
  private fb           = inject(FormBuilder);
  private subs         = new Subscription();

  // ── Données ──
  projet          = signal<Projet | null>(null);
  activites       = signal<Activite[]>([]);
  commentaires    = signal<Commentaire[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);
  statutsProjet   = signal<StatutProjet[]>([]);
  typesProjet     = signal<TypeProjet[]>([]);
  tousGroupes     = signal<Groupe[]>([]);

  // ── États UI ──
  loading            = signal(true);
  loadingComments    = signal(false);
  submittingActivite = signal(false);
  submittingComment  = signal(false);
  savingProjet       = signal(false);

  // ── Vue activités ──
  vueActivites = signal<VueActivites>('kanban');

  // ── Filtres et tri ──
  filtreAssigneId = signal<number | ''>('');
  filtreStatutId  = signal<number | ''>('');
  filtreSearch    = signal('');
  sortBy          = signal<'priorite' | 'echeance' | 'nom'>('priorite');

  // ── Slides ouverts ──
  slideActOpen    = signal(false);
  editingActId    = signal<number | null>(null);
  slideProjetOpen = signal(false);

  // ── Commentaires ──
  nouveauCommentaire = signal('');
  groupeIdComment    = signal<number | null>(null);
  editingCommentId   = signal<number | null>(null);
  editContenu        = signal('');

  // ── Drag & Drop Kanban ──
  /** ID de l'activité en cours de drag */
  draggingActId    = signal<number | null>(null);
  /** ID du statut de la colonne survolée */
  dragOverStatutId = signal<number | null>(null);
  /** Activité en cours de drag (pour la déplacer) */
  private draggingActivite: Activite | null = null;

  // ── User courant ──
  currentUserKcId = '';
  currentUserNom  = '';

  // ── Formulaire activité ──
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
    utilisateurId:   [null]
  });

  // ── Formulaire édition projet ──
  projetForm: FormGroup = this.fb.group({
    nom:                        ['', Validators.required],
    description:                [''],
    couleur:                    ['#6366f1'],
    statutProjetId:             [null],
    typeProjetId:               [null],
    clientId:                   [null],
    dateDebut:                  [null],
    dateFin:                    [null],
    budgetPrevu:                [null],
    heuresEstimees:             [null],
    seuilAlerteHoraire:         [80],
    typeBudget:                 ['ILLIMITE'],
    visible:                    [true],
    facturable:                 [true],
    autoriserActivitesGlobales: [false]
  });

  // ── Constantes ──
  readonly COULEURS = [
    '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
    '#eab308','#10b981','#06b6d4','#3b82f6','#64748b'
  ];

  readonly PRIORITES = [
    { value: 1, label: 'Basse',   couleur: '#10b981' },
    { value: 2, label: 'Normale', couleur: '#3b82f6' },
    { value: 3, label: 'Haute',   couleur: '#f97316' },
    { value: 4, label: 'Urgente', couleur: '#ef4444' }
  ];

  // ── Computed ──

  /** Activités filtrées + triées selon les filtres courants */
  activitesFiltrees = computed(() => {
    let list = this.activites();
    const q  = this.filtreSearch().toLowerCase();

    if (q) list = list.filter(a =>
      a.nom.toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q)
    );
    if (this.filtreStatutId())  list = list.filter(a => a.statutActiviteId === +this.filtreStatutId());
    if (this.filtreAssigneId()) list = list.filter(a => a.utilisateurId === +this.filtreAssigneId());

    const s = this.sortBy();
    return [...list].sort((a, b) => {
      if (s === 'priorite') return (b.priorite || 0) - (a.priorite || 0);
      if (s === 'echeance') return (a.dateEcheance || '').localeCompare(b.dateEcheance || '');
      return a.nom.localeCompare(b.nom);
    });
  });

  /** Groupement par statut pour la vue Kanban */
  activitesParStatut = computed(() => {
    const statuts   = this.statutsActivite();
    const activites = this.activitesFiltrees();
    return statuts.map(s => ({
      statut: s,
      items: activites.filter(a => a.statutActiviteId === s.id)
    }));
  });

  /** Stats rapides : nombre d'activités par statut */
  statsActivites = computed(() => {
    const list    = this.activites();
    const statuts = this.statutsActivite();
    return statuts
      .map(s => ({ ...s, count: list.filter(a => a.statutActiviteId === s.id).length }))
      .filter(s => s.count > 0);
  });

  /** Liste des assignés distincts dans les activités du projet */
  assignes = computed(() => {
    const seen = new Set<number>();
    return this.activites()
      .filter(a => a.utilisateurId && !seen.has(a.utilisateurId!) && seen.add(a.utilisateurId!))
      .map(a => ({ id: a.utilisateurId!, nom: a.utilisateurNomComplet || '' }));
  });

  // ──────────────────────────────────────────────────────────────
  //  LIFECYCLE
  // ──────────────────────────────────────────────────────────────

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

    // Charger le projet
    this.projetSvc.getById(id).subscribe({
      next: p => {
        this.projet.set(p);
        this.loading.set(false);
        this.loadActivites(id);
        if (this.perms.canCommentAnyProject() || this.perms.canViewProjectDetails()) {
          this.loadCommentaires(id);
        }
      },
      error: () => {
        this.ui.error('Projet non trouvé.');
        this.router.navigate(['/projets']);
      }
    });

    // Charger les nomenclatures
    this.nomencSvc.getStatutsActivite().subscribe({
      next: s => {
        this.statutsActivite.set(s);
        if (s.length) this.actForm.patchValue({ statutActiviteId: s[0].id });
      }
    });

    this.projetSvc.getStatutsProjet().subscribe({ next: d => this.statutsProjet.set(d) });
    this.projetSvc.getTypesProjet().subscribe({ next: d => this.typesProjet.set(d) });

    if (this.perms.canViewTeams())
      this.groupeSvc.getAll().subscribe({ next: g => this.tousGroupes.set(g) });

    // Notifications temps réel
    this.subs.add(this.notifSvc.newNotification$.subscribe(n => {
      const t = String(n.type);
      const pid = this.projet()?.id;
      if (pid && t === 'PROJET_COMMENTAIRE' && n.ressourceId === pid)
        this.loadCommentaires(pid);
      if (pid && t === 'PROJET_STATUT_CHANGE' && n.ressourceId === pid)
        this.projetSvc.getById(pid).subscribe({ next: p => this.projet.set(p) });
    }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  // ──────────────────────────────────────────────────────────────
  //  CHARGEMENT
  // ──────────────────────────────────────────────────────────────

  loadActivites(projetId: number): void {
    if (this.perms.canSeeAnyActivity())
      this.activiteSvc.getByProjet(projetId).subscribe({
        next: a => this.activites.set(a),
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

  // ──────────────────────────────────────────────────────────────
  //  DRAG & DROP KANBAN
  //  L'utilisateur fait glisser une carte d'une colonne vers une autre.
  //  Au drop, on appelle changerStatut() pour persister le changement.
  // ──────────────────────────────────────────────────────────────

  /** Début du drag : mémorise l'activité déplacée */
  onDragStart(event: DragEvent, activite: Activite): void {
    this.draggingActivite = activite;
    this.draggingActId.set(activite.id);
    // Données de transfert (requis par certains navigateurs)
    event.dataTransfer?.setData('text/plain', String(activite.id));
  }

  /** Fin du drag : nettoyage */
  onDragEnd(): void {
    this.draggingActivite = null;
    this.draggingActId.set(null);
    this.dragOverStatutId.set(null);
  }

  /** Survol d'une colonne : nécessaire pour autoriser le drop */
  onDragOver(event: DragEvent): void {
    event.preventDefault(); // Indispensable pour permettre le drop
    event.dataTransfer!.dropEffect = 'move';
  }

  /** Entrée dans une colonne : met en surbrillance */
  onDragEnter(event: DragEvent, statutId: number): void {
    event.preventDefault();
    this.dragOverStatutId.set(statutId);
  }

  /** Sortie d'une colonne : retire la surbrillance si on quitte vers l'extérieur */
  onDragLeave(event: DragEvent): void {
    // Vérifie qu'on quitte vraiment la colonne (pas juste une carte enfant)
    const related = event.relatedTarget as HTMLElement | null;
    const target  = event.currentTarget as HTMLElement;
    if (!related || !target.contains(related)) {
      this.dragOverStatutId.set(null);
    }
  }

  /** Drop sur une colonne : change le statut de l'activité */
  onDrop(event: DragEvent, statutId: number): void {
    event.preventDefault();
    const act = this.draggingActivite;
    if (!act || act.statutActiviteId === statutId) {
      this.onDragEnd();
      return;
    }
    // Optimistic update : mise à jour locale immédiate
    this.activites.update(l =>
      l.map(a => a.id === act.id ? { ...a, statutActiviteId: statutId } : a)
    );
    // Persistence côté serveur
    this.activiteSvc.changerStatut(act.id, statutId).subscribe({
      next: saved => {
        // Confirme avec la valeur serveur
        this.activites.update(l => l.map(a => a.id === saved.id ? saved : a));
      },
      error: () => {
        // Rollback si erreur
        this.activites.update(l =>
          l.map(a => a.id === act.id ? { ...a, statutActiviteId: act.statutActiviteId } : a)
        );
        this.ui.error('Erreur lors du changement de statut.');
      }
    });
    this.onDragEnd();
  }

  // ──────────────────────────────────────────────────────────────
  //  CRUD ACTIVITÉS
  // ──────────────────────────────────────────────────────────────

  openCreateAct(): void {
    if (!this.perms.canCreateActivity() && !this.perms.canEditAnyProject()) {
      this.ui.warning('Permission requise.'); return;
    }
    this.editingActId.set(null);
    this.actForm.reset({
      nom: '', description: '', couleur: '#6366f1',
      statutActiviteId: this.statutsActivite()[0]?.id || null,
      priorite: 2, heuresEstimees: null, dateEcheance: null,
      estGlobale: false, visible: true, facturable: true, utilisateurId: null
    });
    this.slideActOpen.set(true);
  }

  openEditAct(a: Activite, e: Event): void {
    e.stopPropagation();
    if (!this.perms.canEditAnyActivity()) { this.ui.warning('Permission requise.'); return; }
    this.editingActId.set(a.id);
    this.actForm.patchValue({
      nom:             a.nom,
      description:     a.description || '',
      couleur:         a.couleur || '#6366f1',
      statutActiviteId:a.statutActiviteId,
      priorite:        a.priorite || 2,
      heuresEstimees:  a.heuresEstimees || null,
      dateEcheance:    a.dateEcheance || null,
      estGlobale:      a.estGlobale || false,
      visible:         a.visible,
      facturable:      a.facturable,
      utilisateurId:   a.utilisateurId || null
    });
    this.slideActOpen.set(true);
  }

  saveAct(): void {
    if (this.actForm.invalid) { this.actForm.markAllAsTouched(); return; }
    const body: ActiviteRequest = this.actForm.getRawValue();
    const editId = this.editingActId();
    const p = this.projet();
    this.submittingActivite.set(true);

    if (editId) {
      this.activiteSvc.update(editId, body).subscribe({
        next: saved => {
          this.activites.update(l => l.map(a => a.id === saved.id ? saved : a));
          this.slideActOpen.set(false);
          this.submittingActivite.set(false);
          this.ui.success('Activité mise à jour ✅');
        },
        error: () => { this.submittingActivite.set(false); this.ui.error('Erreur.'); }
      });
    } else {
      this.activiteSvc.create(body).subscribe({
        next: newAct => {
          if (p) {
            const ids = [...this.activites().map(a => a.id), newAct.id];
            this.projetSvc.assignerActivites(p.id, ids).subscribe();
          }
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
      title: 'Supprimer',
      message: `Supprimer "${a.nom}" ?`,
      confirmLabel: 'Supprimer',
      type: 'danger',
      onConfirm: () => this.activiteSvc.delete(a.id).subscribe({
        next: () => {
          this.activites.update(l => l.filter(x => x.id !== a.id));
          this.ui.success('Supprimée.');
        }
      })
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  ÉDITION PROJET
  // ──────────────────────────────────────────────────────────────

  openEditProjet(): void {
    if (!this.perms.canEditAnyProject()) { this.ui.warning('Permission requise.'); return; }
    const p = this.projet();
    if (!p) return;
    this.projetForm.patchValue({
      nom:                        p.nom,
      description:                p.description || '',
      couleur:                    p.couleur || '#6366f1',
      statutProjetId:             p.statutProjetId || null,
      typeProjetId:               p.typeProjetId || null,
      clientId:                   p.clientId || null,
      dateDebut:                  p.dateDebut || null,
      dateFin:                    p.dateFin || null,
      budgetPrevu:                p.budgetPrevu || null,
      heuresEstimees:             p.heuresEstimees || null,
      seuilAlerteHoraire:         p.seuilAlerteHoraire ?? 80,
      typeBudget:                 p.typeBudget || 'ILLIMITE',
      visible:                    p.visible,
      facturable:                 p.facturable,
      autoriserActivitesGlobales: p.autoriserActivitesGlobales
    });
    this.slideProjetOpen.set(true);
  }

  saveProjet(): void {
    if (this.projetForm.invalid) { this.projetForm.markAllAsTouched(); return; }
    const p = this.projet();
    if (!p) return;
    this.savingProjet.set(true);
    const body: ProjetRequest = this.projetForm.getRawValue();
    this.projetSvc.update(p.id, body).subscribe({
      next: updated => {
        this.projet.set(updated);
        this.slideProjetOpen.set(false);
        this.savingProjet.set(false);
        this.ui.success('Projet mis à jour ✅');
      },
      error: () => { this.savingProjet.set(false); this.ui.error('Erreur sauvegarde.'); }
    });
  }

  // ──────────────────────────────────────────────────────────────
  //  COMMENTAIRES
  // ──────────────────────────────────────────────────────────────

  submitComment(): void {
    if (!this.perms.canCommentAnyProject()) { this.ui.warning('Permission requise.'); return; }
    const contenu = this.nouveauCommentaire().trim();
    if (!contenu) return;
    const p = this.projet();
    if (!p) return;
    this.submittingComment.set(true);
    this.commentSvc.createForProjet(p.id, {
      contenu,
      auteurNom: this.currentUserNom,
      groupeId:  this.groupeIdComment() || undefined
    }).subscribe({
      next: c => {
        this.commentaires.update(l => [c, ...l]);
        this.nouveauCommentaire.set('');
        this.groupeIdComment.set(null);
        this.submittingComment.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error(err.error?.message || 'Erreur envoi.');
        this.submittingComment.set(false);
      }
    });
  }

  startEdit(c: Commentaire): void { this.editingCommentId.set(c.id); this.editContenu.set(c.contenu); }
  saveEdit(c: Commentaire): void {
    const contenu = this.editContenu().trim();
    if (!contenu) return;
    this.commentSvc.update(c.id, contenu).subscribe({
      next: u => {
        this.commentaires.update(l => l.map(x => x.id === c.id ? u : x));
        this.editingCommentId.set(null);
      },
      error: () => this.ui.error('Erreur modification.')
    });
  }
  deleteComment(c: Commentaire): void {
    this.ui.confirm({
      title: 'Supprimer',
      message: 'Supprimer ce commentaire ?',
      type: 'danger',
      confirmLabel: 'Supprimer',
      onConfirm: () => this.commentSvc.delete(c.id).subscribe({
        next: () => this.commentaires.update(l => l.filter(x => x.id !== c.id)),
        error: () => this.ui.error('Erreur suppression.')
      })
    });
  }
  isOwn(c: Commentaire): boolean { return c.auteurKeycloakId === this.currentUserKcId; }

  // ──────────────────────────────────────────────────────────────
  //  HELPERS D'AFFICHAGE
  // ──────────────────────────────────────────────────────────────

  /** Récupère le statut activité par ID */
  getStatutActivite(id?: number) { return this.statutsActivite().find(s => s.id === id); }
  getStatutActiviteCode(id?: number): string    { return this.getStatutActivite(id)?.code    || ''; }
  getStatutActiviteLibelle(id?: number): string { return this.getStatutActivite(id)?.libelle || '—'; }
  getStatutActiviteCouleur(id?: number): string { return this.getStatutActivite(id)?.couleur || '#94a3b8'; }

  /** Récupère les infos du statut projet */
  getStatutProjetColor(id?: number): string { return this.statutsProjet().find(s => s.id === id)?.couleur || '#94a3b8'; }
  getStatutProjetLabel(id?: number): string { return this.statutsProjet().find(s => s.id === id)?.libelle || '—'; }

  /** Récupère le libellé du type de projet */
  getTypeProjetLabel(id?: number): string { return this.typesProjet().find(t => t.id === id)?.libelle || '—'; }

  /** Récupère les infos de priorité */
  getPriorite(v: number) { return this.PRIORITES.find(p => p.value === v); }

  /** Calcule le pourcentage de progression */
  getProgressPct(p?: number, e?: number): number {
    if (!e) return 0;
    return Math.min(100, Math.round(((p || 0) / e) * 100));
  }

  /** Couleur de la barre de progression selon le %, de vert à rouge */
  getProgressColor(pct: number): string {
    if (pct >= 100) return '#ef4444';
    if (pct >= 80)  return '#f59e0b';
    return '#10b981';
  }

  /** Couleur de l'avancement global du projet */
  getAvancementColor(pct: number): string {
    if (pct >= 100) return '#10b981';
    if (pct >= 60)  return '#3b82f6';
    if (pct >= 30)  return '#f97316';
    return '#94a3b8';
  }

  /** Couleur d'avatar dérivée du nom */
  getAvatarColor(name: string): string {
    const c = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#10b981','#06b6d4','#3b82f6'];
    return c[(name || '').charCodeAt(0) % c.length];
  }

  /** Initiales (2 premières lettres) */
  getInitiales(n: string): string {
    return (n || '').split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  }

  /** Formate une date ISO en "JJ Mois AAAA" */
  fmtDate(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const m  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]} ${dt.getFullYear()}`;
  }

  /** Formate une date ISO en "JJ Mois AAAA HH:MM" */
  fmtDateTime(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const m  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]} ${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
  }

  /** Formate des heures décimales en "Xh YY" */
  fmtHeures(h?: number): string {
    if (!h || h <= 0) return '0h';
    const hr = Math.floor(h);
    const mn = Math.round((h - hr) * 60);
    return mn > 0 ? `${hr}h${String(mn).padStart(2, '0')}` : `${hr}h`;
  }

  /** Navigation retour */
  goBack(): void { this.router.navigate(['/projets']); }
}