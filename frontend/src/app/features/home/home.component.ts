// src/app/features/home/home.component.ts — COMPLET
import { Component, OnInit, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { GraduationCapComponent } from '../graduation-cap/graduation-cap.component';

import { UserService }               from '../../services/user.service';
import { KeycloakService }           from '../../services/keycloak.service';
import { PermissionContextService }  from '../../services/permission-context.service';
import { FeuilleTempsService }       from '../../services/feuille-temps.service';
import { DemandeService }            from '../../services/demande.service';
import { ActiviteService }           from '../../services/activite.service';
import { ProjetStageService }        from '../../services/projet-stage-service.service';
import { DocumentEspaceStageService } from '../../services/document-espace-stage.service';
import { ReclamationService }        from '../../services/reclamation.service';
import { ProjetService }             from '../../services/projet.service';
import { StagiaireService } from '../../services/stagiaire.service';
import { Utilisateur }           from '../../shared/models/utilisateur.model';
import { FeuilleTemps }          from '../../shared/models/feuille-temps.model';
import { Demande }               from '../../shared/models/demande.model';
import { Activite }              from '../../shared/models/activite.model';
import { Projet }                from '../../shared/models/projet.model';
import { DocumentEspaceStage }   from '../../shared/models/document-espace-stage.model';
import { Reclamation, StatutReclamation } from '../../shared/models/reclamation.model';
import { GroupeService } from '../../services/groupe.service';
import { Groupe } from '../../shared/models/groupe.model';

interface FluxItem {
  type:      'ACTIVITE' | 'DOCUMENT' | 'DEMANDE';
  titre:     string;
  sousTitre: string;
  date:      string;
  couleur:   string;
  icone:     'check' | 'doc' | 'calendar';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, GraduationCapComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit {

  readonly Math = Math;
  private http = inject(HttpClient);
  private groupeSvc      = inject(GroupeService);
  private stagiaireSvc   = inject(StagiaireService);
  private userSvc        = inject(UserService);
  private keycloak       = inject(KeycloakService);
  readonly perms         = inject(PermissionContextService);
  private ftSvc          = inject(FeuilleTempsService);
  private demandeSvc     = inject(DemandeService);
  private activiteSvc    = inject(ActiviteService);
  private projetStageSvc = inject(ProjetStageService);
  private docStageSvc    = inject(DocumentEspaceStageService);
  private recSvc         = inject(ReclamationService);
  private projetSvc      = inject(ProjetService);
  private router         = inject(Router);
  activiteRecenteExpanded = signal(false);
  loading = signal(true);
  mesSuperviseurs = signal<any[]>([]);
  mesStagiaires = signal<any[]>([]);
  tousLesGroupesApp = signal<Groupe[]>([]);
  mesProjetsGroupe = signal<Projet[]>([]);
  currentUser    = signal<Utilisateur | null>(null);
  feuilleSemaine = signal<FeuilleTemps | null>(null);
  loadingFeuille = signal(false);

  mesDemandes     = signal<Demande[]>([]);
  loadingDemandes = signal(false);

  mesActivites    = signal<Activite[]>([]);
  mesProjetsStage = signal<Projet[]>([]);
  tousLesProjets  = signal<Projet[]>([]);

  mesReclamations     = signal<Reclamation[]>([]);
  statutsReclamation  = signal<StatutReclamation[]>([]);
  loadingReclamations = signal(false);

  fluxRecent = signal<FluxItem[]>([]);

  readonly MOIS       = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  readonly JOURS      = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  private readonly JOURS_COURTS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

  readonly RING1_R    = 55;
  readonly RING2_R    = 47;
  readonly RING3_R    = 39;
  readonly RING1_CIRC = 2 * Math.PI * 55;
  readonly RING2_CIRC = 2 * Math.PI * 47;
  readonly RING3_CIRC = 2 * Math.PI * 39;



  readonly WEEK_LINE_W = 640;
readonly WEEK_LINE_H = 140;

weekLinePoints = computed(() => {
  const jours = this.joursSemaine();
  if (!jours.length) return [];
  const padX = 24, padY = 18;
  const w = this.WEEK_LINE_W - padX * 2;
  const h = this.WEEK_LINE_H - padY * 2;
  return jours.map((j, i) => ({
    ...j,
    x: padX + (jours.length > 1 ? (i / (jours.length - 1)) * w : w / 2),
    y: padY + h - (Math.min(j.pct, 100) / 100) * h
  }));
});

weekLinePath = computed(() => {
  const pts = this.weekLinePoints();
  if (!pts.length) return '';
  return pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
});

weekLineAreaPath = computed(() => {
  const pts = this.weekLinePoints();
  if (!pts.length) return '';
  const line = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  return `${line} L${pts[pts.length - 1].x},${this.WEEK_LINE_H - 18} L${pts[0].x},${this.WEEK_LINE_H - 18} Z`;
});
  // ── Computed ─────────────────────────────────────────────────────────────

  greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  });

  todayLabel = computed(() => {
    const d = new Date();
    return `${this.JOURS[d.getDay()]} · ${d.getDate()} ${this.MOIS[d.getMonth()]} ${d.getFullYear()}`;
  });

  prenom    = computed(() => this.currentUser()?.prenom || '');
  initiales = computed(() => {
    const u = this.currentUser();
    if (!u) return '?';
    return ((u.prenom?.[0] || '') + (u.nom?.[0] || '')).toUpperCase();
  });

  minutesSemaine = computed(() =>
    (this.feuilleSemaine()?.lignes || []).reduce(
      (s, l) => s + (l.minutesTravaillees || 0) + (l.minutesSupplementaires || 0), 0
    )
  );

  heuresSemaineFmt = computed(() =>
    this.minutesSemaine() > 0
      ? FeuilleTempsService.formatMinutes(this.minutesSemaine())
      : '0:00'
  );

  joursSemaine = computed(() => {
    const f = this.feuilleSemaine();
    if (!f) return [];
    const dates    = FeuilleTempsService.getDatesDesSemaine(f.semaineDu);
    const aujourd  = new Date().toISOString().split('T')[0];
    return dates.map(dateStr => {
      const minutesJour = (f.lignes || [])
        .filter(l => l.date === dateStr)
        .reduce((s, l) => s + (l.minutesTravaillees || 0) + (l.minutesSupplementaires || 0), 0);
      return {
        label:   this.JOURS_COURTS[new Date(dateStr).getDay()],
        minutes: minutesJour,
        isToday: dateStr === aujourd,
        isPast:  dateStr < aujourd,
        pct:     Math.min(100, Math.round((minutesJour / 480) * 100))
      };
    });
  });

  demandesEnAttente  = computed(() => this.mesDemandes().filter(d => !d.dateTraitement).length);
  demandesApprouvees = computed(() => this.mesDemandes().filter(d =>  !!d.dateTraitement).length);

  prochaineDemande = computed(() => {
    const now = new Date();
    return this.mesDemandes()
      .filter(d => d.dateDebut && new Date(d.dateDebut) >= now)
      .sort((a, b) => (a.dateDebut || '').localeCompare(b.dateDebut || ''))[0] || null;
  });

  demandesPct = computed(() => {
    const t = this.mesDemandes().length;
    return t > 0 ? Math.round((this.demandesApprouvees() / t) * 100) : 0;
  });

  demandesRing1Dash = computed(() => {
    const t = this.mesDemandes().length;
    if (!t) return `0 ${this.RING1_CIRC.toFixed(1)}`;
    const f = (this.demandesApprouvees() / t) * this.RING1_CIRC;
    return `${f.toFixed(1)} ${this.RING1_CIRC.toFixed(1)}`;
  });

  demandesRing2Dash = computed(() => {
    const t = this.mesDemandes().length;
    if (!t) return `0 ${this.RING2_CIRC.toFixed(1)}`;
    const f = (this.demandesEnAttente() / t) * this.RING2_CIRC;
    return `${f.toFixed(1)} ${this.RING2_CIRC.toFixed(1)}`;
  });

  reclamationsEnAttente = computed(() =>
    this.mesReclamations().filter(r => r.statutCode === 'EN_ATTENTE').length);
  reclamationsEnCours = computed(() =>
    this.mesReclamations().filter(r => r.statutCode === 'EN_COURS').length);
  reclamationsResolues = computed(() =>
    this.mesReclamations().filter(r => r.statutCode === 'RESOLUE').length);

  reclamationsPct = computed(() => {
    const t = this.mesReclamations().length;
    return t > 0 ? Math.round((this.reclamationsResolues() / t) * 100) : 0;
  });

  reclamationsRing1Dash = computed(() => {
    const t = this.mesReclamations().length;
    if (!t) return `0 ${this.RING1_CIRC.toFixed(1)}`;
    const f = (this.reclamationsResolues() / t) * this.RING1_CIRC;
    return `${f.toFixed(1)} ${this.RING1_CIRC.toFixed(1)}`;
  });

  reclamationsRing2Dash = computed(() => {
    const t = this.mesReclamations().length;
    if (!t) return `0 ${this.RING2_CIRC.toFixed(1)}`;
    const f = (this.reclamationsEnCours() / t) * this.RING2_CIRC;
    return `${f.toFixed(1)} ${this.RING2_CIRC.toFixed(1)}`;
  });

  reclamationsRing3Dash = computed(() => {
    const t = this.mesReclamations().length;
    if (!t) return `0 ${this.RING3_CIRC.toFixed(1)}`;
    const f = (this.reclamationsEnAttente() / t) * this.RING3_CIRC;
    return `${f.toFixed(1)} ${this.RING3_CIRC.toFixed(1)}`;
  });

  activitesEnCours    = computed(() =>
    this.mesActivites().filter(a => a.statutCode !== 'TERMINE' && a.statutCode !== 'ANNULE').length);
  activitesTerminees  = computed(() =>
    this.mesActivites().filter(a => a.statutCode === 'TERMINE').length);
  pctAvancementGlobal = computed(() => {
    const t = this.mesActivites().length;
    return t ? Math.round((this.activitesTerminees() / t) * 100) : 0;
  });

  projetsActifsCount = computed(() => this.tousLesProjets().length);

  hasRightCol = computed(() =>
    this.perms.canSeeDemandeMenu() || this.perms.canViewOwnRec()
  );

  getStatutFeuilleLabel(): string {
    const map: Record<string, string> = {
      BROUILLON: '✎ Brouillon', SOUMISE: '⏳ Soumise',
      VALIDEE: '✓ Validée', REJETEE: '✗ Rejetée'
    };
    return map[this.feuilleSemaine()?.statut || ''] || '';
  }
  getStatutFeuilleBadgeClass(): string {
    const map: Record<string, string> = {
      BROUILLON: 'dt-badge dt-badge-default',
      SOUMISE:   'dt-badge dt-badge-pending',
      VALIDEE:   'dt-badge dt-badge-delivered',
      REJETEE:   'dt-badge dt-badge-canceled'
    };
    return map[this.feuilleSemaine()?.statut || ''] || 'dt-badge dt-badge-default';
  }

  getPctOf(numerator: number, total: number): number {
    return total > 0 ? Math.round((numerator / total) * 100) : 0;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (!kcId) { this.loading.set(false); return; }

    this.userSvc.getUserByKeycloakId(kcId).subscribe({
      next: u => {
        this.currentUser.set(u);
        this.recSvc.getAllStatuts().subscribe({
          next: d => this.statutsReclamation.set(d),
          error: () => {}
        });
        this.chargerBlocsSecondaires(u.id);
      },
      error: () => this.loading.set(false)
    });
  }

  private chargerBlocsSecondaires(userId: number): void {
    const appels: Record<string, any> = {};

    if (this.perms.canSeeFTMenu()) {
      this.loadingFeuille.set(true);
      appels['feuilles'] = this.ftSvc.getByUtilisateur(userId).pipe(catchError(() => of([])));
    }

    // KPI carte profil — groupes
    appels['groupesApp'] = this.groupeSvc.getAll().pipe(catchError(() => of([])));

    // KPI carte profil — projets (via groupes). L'appel n'est déclenché
    // QUE si l'utilisateur a un droit de feuille de temps (même garde que
    // le backend), sinon on force of([]) : jamais de requête 403, donc
    // jamais de toast d'erreur pour les profils sans ce droit (stagiaires).
    appels['projetsGroupe'] = this.perms.canSeeFTMenu()
      ? this.projetSvc.getVisiblesPourFeuilleTemps(userId).pipe(catchError(() => of([])))
      : of([]);

    if (this.perms.canSeeDemandeMenu()) {
      this.loadingDemandes.set(true);
      appels['demandes'] = this.demandeSvc.getByUtilisateur(userId).pipe(catchError(() => of([])));
    }

    if (this.perms.canViewOwnRec()) {
      this.loadingReclamations.set(true);
      appels['reclamations'] = this.recSvc.getByUtilisateur(userId).pipe(catchError(() => of([])));
    }

    appels['projets'] = this.perms.can('PROJECT_VIEW')
      ? this.projetSvc.getAll({ membreId: userId }).pipe(catchError(() => of([])))
      : of([]);

    if (this.perms.can('INT_SUPER_CAN_SUPERVISE')) {
      appels['mesStagiaires'] = this.stagiaireSvc.getMes(userId)
        .pipe(catchError(() => of([])));
    }

    if (this.perms.canSeeProjetsStageMenu()) {
      if (this.perms.estStagiairePur()) {
        appels['projetsStage'] = this.projetStageSvc.getByStagiaire(userId)
          .pipe(catchError(() => of([])));
      } else if (this.perms.can('INT_SUPER_CAN_SUPERVISE')) {
        appels['projetsStage'] = this.projetStageSvc.getBySuperviseur(userId)
          .pipe(catchError(() => of([])));
      }
    }

    if (this.perms.canViewDocEspaceStage()) {
      appels['documentsStage'] = this.docStageSvc.getAll().pipe(catchError(() => of([])));
    }

    if (Object.keys(appels).length === 0) { this.loading.set(false); return; }

    forkJoin(appels).subscribe({
      next: (res: any) => {
        if (res.groupesApp)    this.tousLesGroupesApp.set(res.groupesApp);
        if (res.projetsGroupe) this.mesProjetsGroupe.set(res.projetsGroupe);

        if (res.feuilles) {
          const lundi = FeuilleTempsService.getLundiSemaine();
          this.feuilleSemaine.set(
            (res.feuilles as FeuilleTemps[]).find(f => f.semaineDu === lundi) || null
          );
          this.loadingFeuille.set(false);
        }

        if (res.demandes) {
          this.mesDemandes.set(res.demandes);
          this.loadingDemandes.set(false);
        }

        if (res.reclamations) {
          const statuts = this.statutsReclamation();
          const enriched = (res.reclamations as Reclamation[]).map(r => ({
            ...r,
            statutCode: statuts.find(s => s.id === r.statutReclamationId)?.code || r.statutCode || ''
          }));
          this.mesReclamations.set(enriched);
          this.loadingReclamations.set(false);
        }

        if (res.projets)
          this.tousLesProjets.set(res.projets);

        if (res.projetsStage) {
          const projets = res.projetsStage as any[];

          if (this.perms.can('INT_SUPER_CAN_SUPERVISE')) {
            const seen = new Set<number>();
            const stags: any[] = [];
            projets.forEach(p => {
              (p.stagiaires || []).forEach((s: any) => {
                if (!seen.has(s.id)) { seen.add(s.id); stags.push(s); }
              });
            });
            this.mesStagiaires.set(stags);
          }

          if (this.perms.estStagiairePur() && projets.length > 0) {
            forkJoin(
              projets.map((p: any) =>
                this.http.get<any[]>(
                  `http://localhost:8085/api/application/projets/${p.id}/superviseurs-stagiaires`
                ).pipe(catchError(() => of([])))
              )
            ).subscribe(resultats => {
              const seen = new Set<number>();
              const sups: any[] = [];
              (resultats as any[][]).forEach(rows => {
                rows.forEach(r => {
                  if (r.stagiaireId === userId) {
                    (r.superviseurs || []).forEach((s: any) => {
                      if (!seen.has(s.id)) { seen.add(s.id); sups.push(s); }
                    });
                  }
                });
              });
              this.mesSuperviseurs.set(sups);
            });
          }

          if (this.perms.estStagiairePur()) {
            const ids = projets.map((p: any) => p.id);
            if (ids.length > 0) {
              forkJoin(
                ids.map((id: number) =>
                  this.activiteSvc.getByProjet(id).pipe(catchError(() => of([])))
                )
              ).subscribe(listes => {
                this.mesActivites.set((listes as any[][]).flat());
                this.construireFlux(res.documentsStage || []);
              });
            } else {
              this.construireFlux(res.documentsStage || []);
            }
          } else {
            this.construireFlux(res.documentsStage || []);
          }
        }

        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private construireFlux(documents: DocumentEspaceStage[]): void {
    const items: FluxItem[] = [];

    this.mesActivites()
      .filter(a => a.dateMiseAJour)
      .forEach(a => items.push({
        type: 'ACTIVITE', titre: a.nom,
        sousTitre: a.statutLibelle || 'Mise à jour',
        date: a.dateMiseAJour!, couleur: a.statutCouleur || a.couleur || '#6366f1', icone: 'check'
      }));

    documents.filter(d => d.dateUpload).slice(0, 10)
      .forEach(d => items.push({
        type: 'DOCUMENT', titre: d.nom,
        sousTitre: d.projetNom || d.activiteNom || 'Document général',
        date: d.dateUpload, couleur: '#10b981', icone: 'doc'
      }));

    this.mesDemandes().filter(d => d.dateCreation)
      .forEach(d => items.push({
        type: 'DEMANDE', titre: d.sujet,
        sousTitre: d.dateTraitement ? 'Traitée' : 'En attente',
        date: d.dateCreation!, couleur: d.dateTraitement ? '#10b981' : '#f59e0b', icone: 'calendar'
      }));

    items.sort((a, b) => b.date.localeCompare(a.date));
    this.fluxRecent.set(items.slice(0, 8));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  fmtRelatif(dateStr: string): string {
    if (!dateStr) return '—';
    const date    = new Date(dateStr);
    const diffMs  = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)  return 'À l\'instant';
    if (diffMin < 60) return `${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH  < 24)  return `${diffH}h`;
    const diffJ = Math.floor(diffH / 24);
    if (diffJ === 1)  return 'Hier';
    if (diffJ  < 7)   return `${diffJ}j`;
    return `${date.getDate()} ${this.MOIS[date.getMonth()]}`;
  }

  fmtDateShort(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.getDate()} ${this.MOIS[d.getMonth()]}`;
  }

  goTo(path: string): void { this.router.navigate([path]); }

  getInitiales(nom: string): string {
    if (!nom?.trim()) return '?';
    const parts = nom.trim().split(' ').filter(p => p.length > 0);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : nom.substring(0, 2).toUpperCase();
  }

  activitesAffichees = computed(() =>
  this.activiteRecenteExpanded() ? this.fluxRecent() : this.fluxRecent().slice(0, 4)
);

  // ── KPI carte profil ──────────────────────────────────────────────────
  joursAnciennete = computed(() => {
    const d = this.currentUser()?.dateEmbauche;
    if (!d) return 0;
    const debut  = new Date(d);
    const auj    = new Date();
    const diffMs = auj.getTime() - debut.getTime();
    return diffMs > 0 ? Math.floor(diffMs / 86400000) : 0;
  });

  nbGroupesRejoints = computed(() => {
    const uid = this.currentUser()?.id;
    if (!uid) return 0;
    return this.tousLesGroupesApp().filter(g =>
      ((g as any).membres || []).some((m: any) => m.id === uid)
    ).length;
  });

  nbProjetsRejoints = computed(() => this.mesProjetsGroupe().length);
}