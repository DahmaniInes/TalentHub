// src/app/features/home/home.component.ts — REMPLACE COMPLET
import { Component, OnInit, ViewEncapsulation, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { UserService } from '../../services/user.service';
import { KeycloakService } from '../../services/keycloak.service';
import { PermissionContextService } from '../../services/permission-context.service';
import { FeuilleTempsService } from '../../services/feuille-temps.service';
import { DemandeService } from '../../services/demande.service';
import { ActiviteService } from '../../services/activite.service';
import { ProjetStageService } from '../../services/projet-stage-service.service';
import { DocumentEspaceStageService } from '../../services/document-espace-stage.service';

import { Utilisateur } from '../../shared/models/utilisateur.model';
import { FeuilleTemps } from '../../shared/models/feuille-temps.model';
import { Demande } from '../../shared/models/demande.model';
import { Activite } from '../../shared/models/activite.model';
import { Projet } from '../../shared/models/projet.model';
import { DocumentEspaceStage } from '../../shared/models/document-espace-stage.model';

/** Élément générique du flux "Activité récente", toutes sources confondues. */
interface FluxItem {
  type: 'ACTIVITE' | 'DOCUMENT' | 'DEMANDE';
  titre: string;
  sousTitre: string;
  date: string;
  couleur: string;
  icone: 'check' | 'doc' | 'calendar';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit {

  readonly Math = Math;

  private userSvc     = inject(UserService);
  private keycloak     = inject(KeycloakService);
  readonly perms        = inject(PermissionContextService);
  private ftSvc         = inject(FeuilleTempsService);
  private demandeSvc    = inject(DemandeService);
  private activiteSvc   = inject(ActiviteService);
  private projetStageSvc = inject(ProjetStageService);
  private docStageSvc   = inject(DocumentEspaceStageService);
  private router        = inject(Router);

  loading = signal(true);

  currentUser = signal<Utilisateur | null>(null);

  // ── Feuille de temps de la semaine en cours ──
  feuilleSemaine = signal<FeuilleTemps | null>(null);
  loadingFeuille = signal(false);

  // ── Mes demandes ──
  mesDemandes = signal<Demande[]>([]);
  loadingDemandes = signal(false);

  // ── Mes activités (espace stage, si applicable) ──
  mesActivites = signal<Activite[]>([]);
  mesProjetsStage = signal<Projet[]>([]);

  // ── Flux d'activité récente (agrégé) ──
  fluxRecent = signal<FluxItem[]>([]);

  readonly MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  readonly JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

  // ════════════════════════════════════════════════════════════
  // COMPUTED — affichage
  // ════════════════════════════════════════════════════════════

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

  prenom = computed(() => this.currentUser()?.prenom || '');

  initiales = computed(() => {
    const u = this.currentUser();
    if (!u) return '?';
    return ((u.prenom?.[0] || '') + (u.nom?.[0] || '')).toUpperCase();
  });

  /** Minutes travaillées cette semaine, agrégées sur tous les jours de la feuille. */
  minutesSemaine = computed(() => this.feuilleSemaine()?.minutesTravaillees || 0);

  heuresSemaineFmt = computed(() => FeuilleTempsService.formatMinutes(this.minutesSemaine()));

  /** Répartition par jour pour le mini bar-chart "Cette semaine". */
  joursSemaine = computed(() => {
    const f = this.feuilleSemaine();
    if (!f) return [];
    const lundi = f.semaineDu;
    const dates = FeuilleTempsService.getDatesDesSemaine(lundi);
    const aujourd = new Date().toISOString().split('T')[0];

    return dates.map((dateStr, i) => {
      const ligne = f.lignes?.find(l => l.date === dateStr);
      const minutes = ligne?.minutesTravaillees || 0;
      return {
        label: FeuilleTempsService.formatColJour(dateStr).substring(0, 3),
        minutes,
        isToday: dateStr === aujourd,
        isPast: dateStr < aujourd,
        pct: Math.min(100, Math.round((minutes / 480) * 100)) // 480min = 8h, base de référence visuelle
      };
    });
  });

  demandesEnAttente = computed(() =>
    this.mesDemandes().filter(d => d.statutDemandeId === 1 || !d.dateTraitement).length);

  demandesApprouvees = computed(() =>
    this.mesDemandes().filter(d => !!d.dateTraitement).length);

  prochaineDemande = computed(() => {
    const futures = this.mesDemandes()
      .filter(d => d.dateDebut && new Date(d.dateDebut) >= new Date())
      .sort((a, b) => (a.dateDebut || '').localeCompare(b.dateDebut || ''));
    return futures[0] || null;
  });

  activitesEnCours = computed(() =>
    this.mesActivites().filter(a => a.statutCode !== 'TERMINE' && a.statutCode !== 'ANNULE').length);

  activitesTerminees = computed(() =>
    this.mesActivites().filter(a => a.statutCode === 'TERMINE').length);

  pctAvancementGlobal = computed(() => {
    const total = this.mesActivites().length;
    if (!total) return 0;
    return Math.round((this.activitesTerminees() / total) * 100);
  });

  // ════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ════════════════════════════════════════════════════════════

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (!kcId) { this.loading.set(false); return; }

    this.userSvc.getUserByKeycloakId(kcId).subscribe({
      next: u => {
        this.currentUser.set(u);
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

    if (this.perms.canSeeDemandeMenu()) {
      this.loadingDemandes.set(true);
      appels['demandes'] = this.demandeSvc.getByUtilisateur(userId).pipe(catchError(() => of([])));
    }

    if (this.perms.canSeeProjetsStageMenu()) {
      appels['projetsStage'] = this.perms.canViewAllProjetsStage()
          ? of([]) // un admin n'a pas de "mes projets" personnels sur cette page d'accueil
          : (this.perms.canViewMyProjet()
              ? this.projetStageSvc.getByStagiaire(userId).pipe(catchError(() => of([])))
              : this.projetStageSvc.getBySuperviseur(userId).pipe(catchError(() => of([]))));
    }

    if (this.perms.canViewDocEspaceStage()) {
      appels['documentsStage'] = this.docStageSvc.getAll().pipe(catchError(() => of([])));
    }

    if (Object.keys(appels).length === 0) {
      this.loading.set(false);
      return;
    }

    forkJoin(appels).subscribe({
      next: (res: any) => {
        if (res.feuilles) {
          const lundiActuel = FeuilleTempsService.getLundiSemaine();
          const feuilleActuelle = (res.feuilles as FeuilleTemps[])
              .find(f => f.semaineDu === lundiActuel) || null;
          this.feuilleSemaine.set(feuilleActuelle);
          this.loadingFeuille.set(false);
        }

        if (res.demandes) {
          this.mesDemandes.set(res.demandes);
          this.loadingDemandes.set(false);
        }

        if (res.projetsStage) {
          this.mesProjetsStage.set(res.projetsStage);
          // Agrège les activités de tous mes projets de stage pour le résumé
          const projetIds = (res.projetsStage as Projet[]).map(p => p.id);
          if (projetIds.length > 0) {
            forkJoin(projetIds.map(id =>
                this.activiteSvc.getByProjet(id).pipe(catchError(() => of([])))
            )).subscribe(listes => {
              this.mesActivites.set(listes.flat());
              this.construireFlux(res.documentsStage || []);
            });
          } else {
            this.construireFlux(res.documentsStage || []);
          }
        } else {
          this.construireFlux(res.documentsStage || []);
        }

        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  /** Fusionne activités récentes + documents récents en un flux unique trié par date. */
  private construireFlux(documents: DocumentEspaceStage[]): void {
    const items: FluxItem[] = [];

    this.mesActivites()
      .filter(a => a.dateMiseAJour)
      .forEach(a => items.push({
        type: 'ACTIVITE',
        titre: a.nom,
        sousTitre: a.statutLibelle || 'Mise à jour',
        date: a.dateMiseAJour!,
        couleur: a.statutCouleur || a.couleur || '#6366f1',
        icone: 'check'
      }));

    documents
      .filter(d => d.dateUpload)
      .slice(0, 10)
      .forEach(d => items.push({
        type: 'DOCUMENT',
        titre: d.nom,
        sousTitre: d.projetNom || d.activiteNom || 'Document général',
        date: d.dateUpload,
        couleur: '#10b981',
        icone: 'doc'
      }));

    this.mesDemandes()
      .filter(d => d.dateCreation)
      .forEach(d => items.push({
        type: 'DEMANDE',
        titre: d.sujet,
        sousTitre: d.dateTraitement ? 'Traitée' : 'En attente',
        date: d.dateCreation!,
        couleur: d.dateTraitement ? '#10b981' : '#f59e0b',
        icone: 'calendar'
      }));

    items.sort((a, b) => b.date.localeCompare(a.date));
    this.fluxRecent.set(items.slice(0, 8));
  }

  // ════════════════════════════════════════════════════════════
  // HELPERS AFFICHAGE
  // ════════════════════════════════════════════════════════════

  fmtRelatif(dateStr: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffJ = Math.floor(diffH / 24);
    if (diffJ === 1) return 'Hier';
    if (diffJ < 7) return `${diffJ}j`;
    return `${date.getDate()} ${this.MOIS[date.getMonth()]}`;
  }

  fmtDateShort(dateStr?: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.getDate()} ${this.MOIS[d.getMonth()]}`;
  }

  goTo(path: string): void { this.router.navigate([path]); }
}