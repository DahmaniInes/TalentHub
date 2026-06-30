// calendrier.component.ts — COMPLET CORRIGÉ
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeuilleTempsService }      from '../../../../services/feuille-temps.service';
import { ProjetService }            from '../../../../services/projet.service';
import { ActiviteService }          from '../../../../services/activite.service';
import { UserService }              from '../../../../services/user.service';
import { KeycloakService }          from '../../../../services/keycloak.service';
import { UiService }                from '../../../../services/ui.service';
import { ErrorService }             from '../../../../services/error.service';
import { PermissionContextService } from '../../../../services/permission-context.service';
import { FeuilleTemps, LigneFeuilleTempsRequest } from '../../../../shared/models/feuille-temps.model';
import { Projet }      from '../../../../shared/models/projet.model';
import { Activite }    from '../../../../shared/models/activite.model';
import { Utilisateur } from '../../../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';
import { GroupeService, MembreInfo } from '../../../../services/groupe.service';

export type VueCal = 'mois' | 'semaine' | 'jour';

export interface EntreeCal {
  id?:           number;
  feuilleId:     number;
  feuilleStatut: string;
  utilisateurId: number;
  date:          string;
  projetId?:     number;  projetNom?:   string;
  activiteId?:   number;  activiteNom?: string;
  clientId?:     number;  clientNom?:   string;
  heureDebut?:   string;  heureFin?:    string;
  minutesTravaillees:     number;
  minutesSupplementaires: number;
  commentaire?:  string;
  couleur:       string;
}

export interface FormCal {
  date:               string;
  projetId?:          number;
  activiteId?:        number;
  heureDebut:         string;
  heureFin:           string;
  minutesTravaillees: number;
  commentaire:        string;
}

export interface EntreeRecente {
  activiteId?:  number;  activiteNom?: string;
  projetId?:    number;  projetNom?:   string;
  clientId?:    number;  clientNom?:   string;
  heureDebut?:  string;  heureFin?:    string;
  minutesTravaillees: number;
  couleur:      string;
  cle:          string;
}

@Component({
  selector: 'app-calendrier-ft',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendrier.component.html',
  styleUrls: ['./calendrier.component.css']
})
export class CalendrierFtComponent implements OnInit {

  private ftSvc       = inject(FeuilleTempsService);
  private projetSvc   = inject(ProjetService);
  private activiteSvc = inject(ActiviteService);
  private userSvc     = inject(UserService);
  private keycloak    = inject(KeycloakService);
  readonly ui         = inject(UiService);
  private errorSvc    = inject(ErrorService);
  readonly perms      = inject(PermissionContextService);
  private groupeSvc   = inject(GroupeService);
  private readonly STATUT_TERMINE_ID = 4;

  // ── Données ──────────────────────────────────────────────────────────────
  currentUser      = signal<Utilisateur | null>(null);
  selectedUser     = signal<Utilisateur | null>(null);
  utilisateursDropdown = signal<MembreInfo[]>([]);
  feuilles         = signal<FeuilleTemps[]>([]);
  projets          = signal<Projet[]>([]);
  activitesGlobales   = signal<Activite[]>([]);
  activitesParProjet  = signal<Record<number, Activite[]>>({});

  loading = signal(false);
  saving  = signal(false);

  // ── Permissions ───────────────────────────────────────────────────────────
  canReadOwn    = computed(() => this.perms.can('TS_OWN_READ'));
  canCreateOwn  = computed(() => this.perms.can('TS_OWN_CREATE'));
  canUpdateOwn  = computed(() => this.perms.can('TS_OWN_UPDATE'));
  canDeleteOwn  = computed(() => this.perms.can('TS_OWN_DELETE'));
  canReadAll    = computed(() => this.perms.can('TS_ALL_READ'));
  canUpdateAll  = computed(() => this.perms.can('TS_ALL_UPDATE'));
  canReadGroup  = computed(() => this.perms.can('TS_GROUP_READ'));
  canUpdateGroup = computed(() => this.perms.can('TS_GROUP_UPDATE'));

  canViewCalendar = computed(() =>
    this.canReadOwn() || this.canReadAll() || this.canReadGroup()
  );

  canModify = computed(() => {
    const isOwn = this.selectedUser()?.id === this.currentUser()?.id;
    if (isOwn) return this.canUpdateOwn() || this.canCreateOwn();
    return this.canUpdateAll() || this.canUpdateGroup();
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  dateCourante = signal<Date>(new Date());
  vue          = signal<VueCal>('semaine');

  // ── Popups ────────────────────────────────────────────────────────────────
  detailEntree    = signal<EntreeCal | null>(null);
  formulaireOpen  = signal(false);
  formulaireMode  = signal<'ajout' | 'edition'>('ajout');
  entreeEnEdition = signal<EntreeCal | null>(null);
  form: FormCal = this.newForm('', '09:00');

  // ── Drag ─────────────────────────────────────────────────────────────────
  draggingEntree  = signal<EntreeCal | null>(null);
  draggingRecente = signal<EntreeRecente | null>(null);

  // ── Constantes grille horaire ─────────────────────────────────────────────
  readonly JOURS    = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  readonly MOIS_FR  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet',
                       'Août','Septembre','Octobre','Novembre','Décembre'];
  readonly COULEURS = ['#6366f1','#8b5cf6','#10b981','#f97316','#ef4444',
                       '#3b82f6','#c026d3','#eab308','#06b6d4','#84cc16'];

  readonly HEURES_JOUR = Array.from({length: 18}, (_, i) =>
    `${String(i + 6).padStart(2, '0')}:00`
  );
  readonly START_HOUR    = 6;
  readonly START_MINUTES = this.START_HOUR * 60;
  readonly SLOT_PX = 60;

  private _couleurs: Record<string, string> = {};
  private _ci = 0;
  couleurProjet(pid?: number): string {
    const k = String(pid ?? '0');
    if (!this._couleurs[k]) this._couleurs[k] = this.COULEURS[this._ci++ % this.COULEURS.length];
    return this._couleurs[k];
  }

  private loadUtilisateursDropdown(): void {
    const me = this.currentUser();
    if (!me) return;

    if (this.canReadAll() || this.canUpdateAll()) {
      this.groupeSvc.getTousMembresDeGroupes(me.id).subscribe({
        next: d => this.utilisateursDropdown.set(d),
        error: () => this.utilisateursDropdown.set([])
      });
    } else if (this.canReadGroup() || this.canUpdateGroup()) {
      this.groupeSvc.getCoequipiers(me.id).subscribe({
        next: d => this.utilisateursDropdown.set(d),
        error: () => this.utilisateursDropdown.set([])
      });
    }
  }

  getTopPx(heureDebut?: string): number {
    if (!heureDebut) return 0;
    const [h, m] = heureDebut.split(':').map(Number);
    const minutesDepuisDebut = h * 60 + m - this.START_MINUTES;
    return Math.max(0, Math.min(minutesDepuisDebut, this.HEURES_JOUR.length * this.SLOT_PX));
  }

  getHeightPx(dureeMinutes: number): number {
    return Math.max(22, dureeMinutes);
  }

  entreesRecentes = signal<EntreeRecente[]>([]);

  /**
   * ✅ CORRIGÉ — Exclut désormais du bloc "Reprendre une activité" toute
   * entrée dont l'activité résolue est marquée Terminée. Comme
   * activitesParProjet/activitesGlobales ne contiennent déjà que des
   * activités NON terminées (chargées via getByProjet /
   * getGlobalesDisponiblesPourProjet), une activité terminée n'y figure
   * pas — on la considère donc explicitement exclue plutôt que de la
   * laisser passer faute de correspondance trouvée.
   */
  private loadEntreesRecentes(utilisateurId: number): void {
    this.ftSvc.getActivitesRecentesDisponibles(utilisateurId).subscribe({
      next: dtos => {
        const projets = this.projets();
        const recentes: EntreeRecente[] = dtos
          .filter(d => {
            if (!d.activiteId) return true;
            const activitesDuProjet = d.projetId ? (this.activitesParProjet()[d.projetId] ?? []) : [];
            const activite = activitesDuProjet.find(a => a.id === d.activiteId)
                           ?? this.activitesGlobales().find(a => a.id === d.activiteId);
            return !!activite && activite.statutActiviteId !== this.STATUT_TERMINE_ID;
          })
          .map(d => {
            const projet = projets.find(p => p.id === d.projetId);
            const activitesDuProjet = d.projetId ? (this.activitesParProjet()[d.projetId] ?? []) : [];
            const activite = activitesDuProjet.find(a => a.id === d.activiteId)
                           ?? this.activitesGlobales().find(a => a.id === d.activiteId);
            return {
              cle: `${d.projetId ?? 'null'}-${d.activiteId ?? 'null'}`,
              activiteId: d.activiteId,
              activiteNom: activite?.nom,
              projetId: d.projetId,
              projetNom: projet?.nom,
              clientId: d.clientId,
              clientNom: undefined,
              heureDebut: d.heureDebut,
              heureFin: d.heureFin,
              minutesTravaillees: d.minutesTravaillees,
              couleur: this.couleurProjet(d.projetId),
            };
          });
        this.entreesRecentes.set(recentes);
      },
      error: () => this.entreesRecentes.set([])
    });
  }

  // ── Labels navigation ─────────────────────────────────────────────────────
  labelNav = computed(() => {
    const d = this.dateCourante();
    if (this.vue() === 'mois') return `${this.MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
    if (this.vue() === 'jour') return d.toLocaleDateString('fr-FR', {
      weekday:'long', day:'numeric', month:'long', year:'numeric'
    });
    const lundi = this.lundiDe(d);
    const dim   = new Date(lundi); dim.setDate(dim.getDate() + 6);
    return `${lundi.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${dim.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`;
  });

  totalVue = computed(() => {
    const all = this.vue() === 'jour'
      ? this.joursJour().flatMap(j => j.entrees)
      : this.vue() === 'semaine'
      ? this.joursSemaine().flatMap(j => j.entrees)
      : this.joursMois().flatMap(j => j.entrees);
    return all.reduce((s, e) => s + e.minutesTravaillees + e.minutesSupplementaires, 0);
  });

  joursMois = computed(() => {
    const d = this.dateCourante();
    const today = new Date().toISOString().split('T')[0];
    const y = d.getFullYear(); const m = d.getMonth();
    const p1  = new Date(y, m, 1);
    const off  = (p1.getDay() + 6) % 7;
    const deb  = new Date(p1); deb.setDate(deb.getDate() - off);
    const dern = new Date(y, m+1, 0);
    const eDay = (dern.getDay() + 6) % 7;
    const fin  = new Date(dern); if (eDay < 6) fin.setDate(fin.getDate() + (6-eDay));
    const jours: any[] = []; const cur = new Date(deb);
    while (cur <= fin) {
      const ds = cur.toISOString().split('T')[0];
      jours.push({
        date: ds, num: cur.getDate(),
        autreMois: cur.getMonth() !== m,
        today: ds === today,
        we: cur.getDay() === 0 || cur.getDay() === 6,
        entrees: this.entreesDate(ds)
      });
      cur.setDate(cur.getDate() + 1);
    }
    return jours;
  });

  joursSemaine = computed(() => {
    const lundi = this.lundiDe(this.dateCourante());
    const today = new Date().toISOString().split('T')[0];
    return Array.from({length: 7}, (_, i) => {
      const d = new Date(lundi); d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      return {
        date: ds, num: d.getDate(), jourNom: this.JOURS[i],
        today: ds === today, we: i >= 5,
        entrees: this.entreesDate(ds)
      };
    });
  });

  joursJour = computed(() => {
    const ds = this.dateCourante().toISOString().split('T')[0];
    return [{ date: ds, entrees: this.entreesDate(ds) }];
  });

  entreesDate(date: string): EntreeCal[] {
    const res: EntreeCal[] = [];
    for (const ft of this.feuilles()) {
      for (const l of ft.lignes ?? []) {
        const lDate = typeof l.date === 'string' ? l.date : String(l.date);
        if (lDate === date) {
          res.push({
            id: l.id, feuilleId: ft.id, feuilleStatut: ft.statut,
            utilisateurId: ft.utilisateurId, date,
            projetId:    l.projetId,   projetNom:   l.projetNom,
            activiteId:  l.activiteId, activiteNom: l.activiteNom,
            clientId:    l.clientId,   clientNom:   l.clientNom,
            heureDebut:  l.heureDebut, heureFin:    l.heureFin,
            minutesTravaillees:     l.minutesTravaillees,
            minutesSupplementaires: l.minutesSupplementaires,
            commentaire: l.commentaire,
            couleur:     this.couleurProjet(l.projetId),
          });
        }
      }
    }
    return res.sort((a, b) => (a.heureDebut || '00:00').localeCompare(b.heureDebut || '00:00'));
  }

  totalDate(date: string): number {
    return this.entreesDate(date).reduce(
      (s, e) => s + e.minutesTravaillees + e.minutesSupplementaires, 0
    );
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (!kcId) { this.loadFeuilles(); return; }

    this.userSvc.getUserByKeycloakId(kcId).subscribe({
      next: u => {
        this.currentUser.set(u);
        this.selectedUser.set(u);

        this.projetSvc.getVisiblesPourFeuilleTemps(u.id).subscribe({
          next: ps => {
            this.projets.set(ps);

            const projetActivitePromises = ps.map(p => Promise.all([
              new Promise<void>(resolve => {
                this.activiteSvc.getByProjet(p.id).subscribe({
                  next: d => { this.activitesParProjet.update(m => ({ ...m, [p.id]: d })); resolve(); },
                  error: () => resolve()
                });
              }),
              new Promise<void>(resolve => {
                this.activiteSvc.getGlobalesDisponiblesPourProjet(p.id).subscribe({
                  next: d => {
                    this.activitesGlobales.update(g => {
                      const ids = new Set(g.map(a => a.id));
                      return [...g, ...d.filter(a => !ids.has(a.id))];
                    });
                    resolve();
                  },
                  error: () => resolve()
                });
              })
            ]));

            Promise.all(projetActivitePromises).then(() => {
              this.loadFeuilles(u.id);
              this.loadEntreesRecentes(u.id);
              this.loadUtilisateursDropdown();
            });
          },
          error: () => {
            this.loadFeuilles(u.id);
            this.loadEntreesRecentes(u.id);
            this.loadUtilisateursDropdown();
          }
        });
      },
      error: () => this.loadFeuilles()
    });
  }

  loadFeuilles(userId?: number): void {
    if (!this.canViewCalendar()) return;
    this.loading.set(true);
    const id = userId ?? this.selectedUser()?.id;
    const obs = id ? this.ftSvc.getByUtilisateur(id) : this.ftSvc.getAll();
    obs.subscribe({
      next: d  => { this.feuilles.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onUserChange(val: string): void {
    const me = this.currentUser();
    const id = val ? +val : me?.id;
    if (!id || (me && id === me.id)) {
      this.selectedUser.set(me ?? null);
      if (me) { this.loadFeuilles(me.id); this.loadEntreesRecentes(me.id); }
      return;
    }
    this.userSvc.getUserById(id).subscribe({
      next: user => {
        this.selectedUser.set(user);
        this.loadFeuilles(user.id);
        this.loadEntreesRecentes(user.id);
      },
      error: () => this.ui.error("Erreur lors du chargement de l'utilisateur sélectionné.")
    });
  }

  loadActivitesDuProjet(projetId: number): void {
    if (this.activitesParProjet()[projetId]) return;
    this.activiteSvc.getByProjet(projetId).subscribe({
      next: d => this.activitesParProjet.update(m => ({ ...m, [projetId]: d }))
    });
  }

  getActivitesPourForm(): Activite[] {
    const pid  = this.form.projetId;
    const glob = this.activitesGlobales();
    if (!pid) return glob;
    const duProjet = this.activitesParProjet()[pid] ?? [];
    return [...duProjet, ...glob.filter(g => !duProjet.find(a => a.id === g.id))];
  }

  onFormProjetChange(): void {
    this.form.activiteId = undefined;
    if (this.form.projetId) this.loadActivitesDuProjet(this.form.projetId);
  }

  onFormHeuresChange(): void {
    if (this.form.heureDebut && this.form.heureFin) {
      const [dh, dm] = this.form.heureDebut.split(':').map(Number);
      const [fh, fm] = this.form.heureFin.split(':').map(Number);
      const tot = (fh*60+fm) - (dh*60+dm);
      if (tot > 0) this.form.minutesTravaillees = tot;
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  naviguer(delta: number): void {
    const d = new Date(this.dateCourante());
    if (this.vue() === 'mois')    d.setMonth(d.getMonth() + delta);
    if (this.vue() === 'semaine') d.setDate(d.getDate() + delta * 7);
    if (this.vue() === 'jour')    d.setDate(d.getDate() + delta);
    this.dateCourante.set(d);
  }
  allerAujourdhui(): void { this.dateCourante.set(new Date()); }
  changerVue(v: VueCal): void { this.vue.set(v); }

  private newForm(date: string, heureDebut = '09:00'): FormCal {
    const [h, m] = heureDebut.split(':').map(Number);
    const heureFin = `${String(Math.min(h+1, 23)).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    return {
      date, projetId: undefined, activiteId: undefined,
      heureDebut, heureFin, minutesTravaillees: 60, commentaire: ''
    };
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  ouvrirAjout(date: string, heure?: string): void {
    if (!this.canModify()) {
      this.ui.warning("Vous n'avez pas la permission d'ajouter une entrée.");
      return;
    }
    this.form = this.newForm(date, heure || '09:00');
    this.formulaireMode.set('ajout');
    this.entreeEnEdition.set(null);
    this.detailEntree.set(null);
    this.formulaireOpen.set(true);
  }

  ouvrirDetail(e: EntreeCal, event?: MouseEvent): void {
    event?.stopPropagation();
    this.detailEntree.set(e);
    this.formulaireOpen.set(false);
  }

  ouvrirEdition(e: EntreeCal): void {
    if (!this.canModify()) { this.ui.warning("Vous n'avez pas la permission de modifier."); return; }
    this.form = {
      date: e.date, projetId: e.projetId, activiteId: e.activiteId,
      heureDebut: e.heureDebut || '09:00', heureFin: e.heureFin || '10:00',
      minutesTravaillees: e.minutesTravaillees, commentaire: e.commentaire || ''
    };
    if (e.projetId) this.loadActivitesDuProjet(e.projetId);
    this.formulaireMode.set('edition');
    this.entreeEnEdition.set(e);
    this.detailEntree.set(null);
    this.formulaireOpen.set(true);
  }

  fermerFormulaire(): void { this.formulaireOpen.set(false); this.entreeEnEdition.set(null); }
  fermerDetail(): void { this.detailEntree.set(null); }

  private getOrCreateFeuille(date: string): { ft: FeuilleTemps | null; lundiDate: string } {
    const user = this.selectedUser() ?? this.currentUser();
    if (!user) return { ft: null, lundiDate: '' };
    const lundiDate = FeuilleTempsService.getLundiSemaine(new Date(date));
    const ft = this.feuilles().find(f =>
      f.semaineDu === lundiDate && f.utilisateurId === user.id &&
      (f.statut === 'BROUILLON' || f.statut === 'REJETEE')
    ) ?? null;
    return { ft, lundiDate };
  }

  private buildLignesExistantes(ft: FeuilleTemps): LigneFeuilleTempsRequest[] {
    return (ft.lignes ?? []).map(l => ({
      date:          l.date,
      projetId:      l.projetId,
      activiteId:    l.activiteId,
      clientId:      l.clientId,
      heureDebut:    l.heureDebut,
      heureFin:      l.heureFin,
      minutesTravaillees:     l.minutesTravaillees,
      minutesSupplementaires: l.minutesSupplementaires,
      commentaire:   l.commentaire,
      estWeekend:    l.estWeekend ?? false
    }));
  }

  private notifierSiAutreUser(date: string): void {
    const me  = this.currentUser();
    const sel = this.selectedUser();
    if (!me || !sel || me.id === sel.id || !sel.keycloakId) return;
    const nomMe  = `${me.prenom || ''} ${me.nom || ''}`.trim();
    const lundi  = FeuilleTempsService.getLundiSemaine(new Date(date));
    this.ftSvc.notifierModification(sel.keycloakId, nomMe, lundi).subscribe({ error: () => {} });
  }

  sauvegarderFormulaire(): void {
    if (!this.canModify()) {
      this.ui.warning("Vous n'avez pas la permission d'effectuer cette action.");
      return;
    }
    if (!this.form.minutesTravaillees || this.form.minutesTravaillees <= 0) {
      this.ui.warning('La durée doit être supérieure à 0.');
      return;
    }
    const user = this.selectedUser() ?? this.currentUser();
    if (!user) { this.ui.warning('Utilisateur non identifié.'); return; }

    const nouvelleLigne: LigneFeuilleTempsRequest = {
      date:          this.form.date,
      projetId:      this.form.projetId,
      activiteId:    this.form.activiteId,
      heureDebut:    this.form.heureDebut,
      heureFin:      this.form.heureFin,
      minutesTravaillees:     this.form.minutesTravaillees,
      minutesSupplementaires: 0,
      commentaire:   this.form.commentaire || undefined,
      estWeekend:    FeuilleTempsService.isWeekend(this.form.date)
    };

    this.saving.set(true);
    const mode = this.formulaireMode();

    if (mode === 'ajout') {
      const { ft: ftExist, lundiDate } = this.getOrCreateFeuille(this.form.date);
      if (ftExist) {
        const lignes = [
          ...this.buildLignesExistantes(ftExist),
          nouvelleLigne
        ];
        this.ftSvc.update(ftExist.id, {
          utilisateurId: user.id,
          semaineDu: ftExist.semaineDu,
          semaineAu: ftExist.semaineAu,
          statut: 'BROUILLON',
          lignes
        }).subscribe({
          next: ft => {
            this.feuilles.update(fs => fs.map(f => f.id === ft.id ? ft : f));
            this.ui.success('Entrée ajoutée ✅');
            this.fermerFormulaire();
            this.saving.set(false);
            this.notifierSiAutreUser(this.form.date);
          },
          error: (err: HttpErrorResponse) => {
            this.ui.error(this.errorSvc.parse(err).message);
            this.saving.set(false);
          }
        });
      } else {
        this.ftSvc.create({
          utilisateurId: user.id,
          semaineDu: lundiDate,
          semaineAu: FeuilleTempsService.getVendrediSemaine(lundiDate),
          statut: 'BROUILLON',
          lignes: [nouvelleLigne]
        }).subscribe({
          next: ft => {
            this.feuilles.update(fs => [...fs, ft]);
            this.ui.success('Entrée ajoutée ✅');
            this.fermerFormulaire();
            this.saving.set(false);
            this.notifierSiAutreUser(this.form.date);
          },
          error: (err: HttpErrorResponse) => {
            this.ui.error(this.errorSvc.parse(err).message);
            this.saving.set(false);
          }
        });
      }
    } else {
      const edition = this.entreeEnEdition();
      if (!edition) return;
      const ft = this.feuilles().find(f => f.id === edition.feuilleId);
      if (!ft || (ft.statut !== 'BROUILLON' && ft.statut !== 'REJETEE')) {
        this.ui.warning('Cette feuille ne peut pas être modifiée.');
        this.saving.set(false);
        return;
      }
      const lignes: LigneFeuilleTempsRequest[] = (ft.lignes ?? []).map(l =>
        l.id === edition.id
          ? nouvelleLigne
          : {
              date:          l.date,
              projetId:      l.projetId,
              activiteId:    l.activiteId,
              clientId:      l.clientId,
              heureDebut:    l.heureDebut,
              heureFin:      l.heureFin,
              minutesTravaillees:     l.minutesTravaillees,
              minutesSupplementaires: l.minutesSupplementaires,
              commentaire:   l.commentaire,
              estWeekend:    l.estWeekend ?? false
            }
      );
      this.ftSvc.update(ft.id, {
        utilisateurId: ft.utilisateurId,
        semaineDu: ft.semaineDu,
        semaineAu: ft.semaineAu,
        statut: ft.statut,
        lignes
      }).subscribe({
        next: u => {
          this.feuilles.update(fs => fs.map(f => f.id === u.id ? u : f));
          this.ui.success('Entrée modifiée ✅');
          this.fermerFormulaire();
          this.saving.set(false);
          this.notifierSiAutreUser(this.form.date);
        },
        error: (err: HttpErrorResponse) => {
          this.ui.error(this.errorSvc.parse(err).message);
          this.saving.set(false);
        }
      });
    }
  }

  supprimerEntree(e: EntreeCal): void {
    if (!this.canModify()) { this.ui.warning("Vous n'avez pas la permission de supprimer."); return; }
    const ft = this.feuilles().find(f => f.id === e.feuilleId);
    if (!ft || (ft.statut !== 'BROUILLON' && ft.statut !== 'REJETEE')) {
      this.ui.warning('Cette feuille ne peut pas être modifiée.'); return;
    }
    this.ui.confirm({
      title: 'Supprimer cette entrée',
      message: `Supprimer "${e.projetNom || 'cette entrée'}" du ${e.date} ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        const lignes = (ft.lignes ?? []).filter(l => l.id !== e.id).map(l => ({
          date:l.date, projetId:l.projetId, projetNom:l.projetNom,
          activiteId:l.activiteId, activiteNom:l.activiteNom,
          heureDebut:l.heureDebut, heureFin:l.heureFin,
          minutesTravaillees:l.minutesTravaillees, minutesSupplementaires:l.minutesSupplementaires,
          commentaire:l.commentaire, estWeekend:l.estWeekend ?? false
        }));
        this.ftSvc.update(ft.id, {
          utilisateurId:ft.utilisateurId, semaineDu:ft.semaineDu, semaineAu:ft.semaineAu, statut:ft.statut, lignes
        }).subscribe({
          next: u => { this.feuilles.update(fs => fs.map(f => f.id===u.id ? u : f)); this.ui.success('Entrée supprimée.'); this.fermerDetail(); this.notifierSiAutreUser(e.date); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  peutDrag(e: EntreeCal): boolean {
    return this.canModify() && (e.feuilleStatut === 'BROUILLON' || e.feuilleStatut === 'REJETEE');
  }

  onDragStart(event: DragEvent, e: EntreeCal): void {
    if (!this.peutDrag(e)) { event.preventDefault(); return; }
    this.draggingEntree.set(e);
    this.draggingRecente.set(null);
    event.dataTransfer?.setData('type', 'entree');
  }

  onRecenteDragStart(event: DragEvent, r: EntreeRecente): void {
    if (!this.canModify()) { event.preventDefault(); return; }
    this.draggingRecente.set(r);
    this.draggingEntree.set(null);
    event.dataTransfer?.setData('type', 'recente');
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onDrop(event: DragEvent, date: string, heure?: string): void {
    event.preventDefault();

    const r = this.draggingRecente();
    if (r) {
      const heureDebut = heure || '09:00';
      const [dh, dm]   = heureDebut.split(':').map(Number);
      const heureFin   = `${String(Math.min(dh+1, 23)).padStart(2,'0')}:${String(dm).padStart(2,'0')}`;

      this.form = {
        date,
        projetId:    r.projetId,
        activiteId:  r.activiteId,
        heureDebut,
        heureFin,
        minutesTravaillees: 60,
        commentaire: '',
      };
      if (r.projetId) this.loadActivitesDuProjet(r.projetId);
      this.formulaireMode.set('ajout');
      this.entreeEnEdition.set(null);
      this.detailEntree.set(null);
      this.formulaireOpen.set(true);
      this.draggingRecente.set(null);
      return;
    }

    const drag = this.draggingEntree();
    if (!drag || drag.date === date) { this.draggingEntree.set(null); return; }
    const ft = this.feuilles().find(f => f.id === drag.feuilleId);
    if (!ft) { this.draggingEntree.set(null); return; }

    const lignes = (ft.lignes ?? []).map(l => ({
      date:     l.id === drag.id ? date : (typeof l.date==='string' ? l.date : String(l.date)),
      projetId: l.projetId, projetNom: l.projetNom,
      activiteId: l.activiteId, activiteNom: l.activiteNom,
      heureDebut: l.heureDebut, heureFin: l.heureFin,
      minutesTravaillees: l.minutesTravaillees, minutesSupplementaires: l.minutesSupplementaires,
      commentaire: l.commentaire,
      estWeekend: FeuilleTempsService.isWeekend(l.id===drag.id ? date : (typeof l.date==='string' ? l.date : String(l.date)))
    }));

    this.ftSvc.update(ft.id, {
      utilisateurId:ft.utilisateurId, semaineDu:ft.semaineDu, semaineAu:ft.semaineAu, statut:ft.statut, lignes
    }).subscribe({
      next: u => { this.feuilles.update(fs => fs.map(f => f.id===u.id ? u : f)); this.ui.success('Entrée déplacée ✅'); this.draggingEntree.set(null); this.notifierSiAutreUser(date); },
      error: (err: HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.draggingEntree.set(null); }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private lundiDe(d: Date): Date {
    const r = new Date(d); r.setDate(r.getDate() - ((r.getDay()+6) % 7)); return r;
  }

  fmtDuree(min: number): string {
    if (!min || min <= 0) return '—';
    const h = Math.floor(min/60); const m = min % 60;
    return m > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`;
  }

  fmtDateFr(ds: string): string {
    return new Date(ds).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  }

  fmtStatut(s: string): string {
    return ({ BROUILLON:'Brouillon', SOUMISE:'Soumise', VALIDEE:'Validée', REJETEE:'Rejetée' } as any)[s] ?? s;
  }

  getInitiales(nomComplet: string): string {
    if (!nomComplet) return '?';
    return nomComplet
      .split(' ')
      .filter(m => m.length > 0)
      .map(m => m[0].toUpperCase())
      .slice(0, 2)
      .join('');
  }

  getAvatarColor(nom: string): string {
    if (!nom) return '#6366f1';
    const couleurs = [
      '#6366f1', '#8b5cf6', '#10b981', '#f97316', '#ef4444',
      '#3b82f6', '#c026d3', '#eab308', '#06b6d4', '#84cc16'
    ];
    let hash = 0;
    for (let i = 0; i < nom.length; i++) {
      hash = nom.charCodeAt(i) + ((hash << 5) - hash);
    }
    return couleurs[Math.abs(hash) % couleurs.length];
  }

  showUserSelector = computed(() =>
    this.canReadGroup() || this.canUpdateGroup() || this.canReadAll() || this.canUpdateAll()
  );
}