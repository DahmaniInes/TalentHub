// calendrier.component.ts — COMPLET CORRIGÉ
// Corrections principales:
// 1. Positionnement en PX (pas %) : top = (heureMinutes - 360)px, height = duréeMinutes px
//    car chaque heure = 60px et la grille commence à 6h (360 min)
// 2. Activités récentes : affichées AVEC projet + client (données issues des lignes existantes)
// 3. Drag depuis sidebar : heure de début = ligne sur laquelle on drop, durée = 1h par défaut
// 4. Permissions : page bloquée si aucun droit de lecture

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

export type VueCal = 'mois' | 'semaine' | 'jour';

// ─── Entrée affichée dans le calendrier (une ligne de feuille de temps) ───────
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

// ─── Formulaire d'ajout/édition ───────────────────────────────────────────────
export interface FormCal {
  date:               string;
  projetId?:          number;
  activiteId?:        number;
  heureDebut:         string;
  heureFin:           string;
  minutesTravaillees: number;
  commentaire:        string;
}

// ─── Activité récente pour la sidebar ────────────────────────────────────────
// Représente la dernière occurrence d'une combinaison projet+activité
export interface EntreeRecente {
  activiteId?:  number;  activiteNom?: string;
  projetId?:    number;  projetNom?:   string;
  clientId?:    number;  clientNom?:   string;
  heureDebut?:  string;  heureFin?:    string;
  minutesTravaillees: number;
  couleur:      string;
  cle:          string; // clé unique "projetId-activiteId"
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

  // ── Données ──────────────────────────────────────────────────────────────
  currentUser      = signal<Utilisateur | null>(null);
  selectedUser     = signal<Utilisateur | null>(null);
  tousUtilisateurs = signal<Utilisateur[]>([]);
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

  // Peut-il voir le calendrier ?
  canViewCalendar = computed(() =>
    this.canReadOwn() || this.canReadAll() || this.canReadGroup()
  );

  // Peut-il modifier la feuille affichée ?
  canModify = computed(() => {
    const isOwn = this.selectedUser()?.id === this.currentUser()?.id;
    if (isOwn) return this.canUpdateOwn() || this.canCreateOwn();
    return this.canUpdateAll() || this.canUpdateGroup();
  });

  // Affiche le sélecteur utilisateur si droits étendus
  showUserSelector = computed(() => this.canReadAll() || this.canReadGroup());

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

  // Grille de 06:00 à 23:00 inclus = 18 créneaux de 60px chacun
  // Chaque créneau = 1 heure = 60px => hauteur totale = 1080px
  readonly HEURES_JOUR = Array.from({length: 18}, (_, i) =>
    `${String(i + 6).padStart(2, '0')}:00`
  );
  // Heure de début de la grille = 6h = 360 minutes depuis minuit
  readonly START_HOUR    = 6;
  readonly START_MINUTES = this.START_HOUR * 60;  // 360
  // Chaque heure correspond à SLOT_PX pixels dans la grille
  readonly SLOT_PX = 60;

  private _couleurs: Record<string, string> = {};
  private _ci = 0;
  couleurProjet(pid?: number): string {
    const k = String(pid ?? '0');
    if (!this._couleurs[k]) this._couleurs[k] = this.COULEURS[this._ci++ % this.COULEURS.length];
    return this._couleurs[k];
  }

  // ── Calcul position en PX (FIX principal) ────────────────────────────────
  // Retourne le décalage en px depuis le haut de la grille
  // top_px = (heure*60 + minutes - START_MINUTES) * SLOT_PX/60
  // Comme SLOT_PX = 60, top_px = (h*60 + m - START_MINUTES) px
  // Ex: 10:00 => (600 - 360) = 240px = exactement sur la ligne 10h ✅
  // Ex: 08:00 => (480 - 360) = 120px = exactement sur la ligne 8h ✅
  getTopPx(heureDebut?: string): number {
    if (!heureDebut) return 0;
    const [h, m] = heureDebut.split(':').map(Number);
    const minutesDepuisDebut = h * 60 + m - this.START_MINUTES;
    // Clamp entre 0 et la hauteur max de la grille
    return Math.max(0, Math.min(minutesDepuisDebut, this.HEURES_JOUR.length * this.SLOT_PX));
  }

  // Retourne la hauteur en px proportionnelle à la durée
  // height_px = duréeMinutes px (car 1 min = 1px, 60min = 60px = 1 slot)
  // Ex: 3h = 180 min = 180px = exactement 3 créneaux ✅
  getHeightPx(dureeMinutes: number): number {
    return Math.max(22, dureeMinutes); // minimum 22px pour voir l'entrée
  }

  // ── Activités récentes du user sélectionné ────────────────────────────────
  // On déduplique par combinaison (projetId + activiteId)
  // et on garde uniquement la plus récente (dernière date)
  entreesRecentes = computed((): EntreeRecente[] => {
    // Map clé => entrée la plus récente pour cette combinaison
    const map = new Map<string, { date: string; entry: EntreeRecente }>();

    for (const ft of this.feuilles()) {
      for (const l of ft.lignes ?? []) {
        // Ignorer les lignes sans durée
        if (!l.minutesTravaillees || l.minutesTravaillees <= 0) continue;

        const lDate = typeof l.date === 'string' ? l.date : String(l.date);
        const cle   = `${l.projetId ?? 'null'}-${l.activiteId ?? 'null'}`;

        const existing = map.get(cle);
        // Garder seulement la plus récente
        if (!existing || lDate > existing.date) {
          map.set(cle, {
            date: lDate,
            entry: {
              cle,
              activiteId:  l.activiteId,
              activiteNom: l.activiteNom,
              projetId:    l.projetId,
              projetNom:   l.projetNom,
              clientId:    l.clientId,
              clientNom:   l.clientNom,
              heureDebut:  l.heureDebut,
              heureFin:    l.heureFin,
              minutesTravaillees: l.minutesTravaillees,
              couleur:     this.couleurProjet(l.projetId),
            }
          });
        }
      }
    }

    // Trier par date décroissante et prendre les 5 premières
    return Array.from(map.values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
      .map(v => v.entry);
  });

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

  // ── Computed des jours pour chaque vue ───────────────────────────────────
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

  // Récupère les entrées d'une date depuis les feuilles chargées
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
    // Trier par heure de début croissante
    return res.sort((a, b) => (a.heureDebut || '00:00').localeCompare(b.heureDebut || '00:00'));
  }

  totalDate(date: string): number {
    return this.entreesDate(date).reduce(
      (s, e) => s + e.minutesTravaillees + e.minutesSupplementaires, 0
    );
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.projetSvc.getAll().subscribe({ next: ps => { this.projets.set(ps); for (const p of ps) this.loadActivitesDuProjet(p.id); } });
    this.activiteSvc.getAll().subscribe({ next: (all: Activite[]) => this.activitesGlobales.set(all.filter(a => a.estGlobale)) });
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => {
          this.currentUser.set(u);
          this.selectedUser.set(u);
          this.loadFeuilles(u.id);
          if (this.canReadAll() || this.canReadGroup()) {
            this.userSvc.getAllUsers().subscribe({ next: d => this.tousUtilisateurs.set(d) });
          }
        },
        error: () => this.loadFeuilles()
      });
    }
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
    const uid  = val ? +val : this.currentUser()?.id;
    const user = this.tousUtilisateurs().find(u => u.id === uid) ?? this.currentUser();
    this.selectedUser.set(user ?? null);
    if (uid) this.loadFeuilles(uid);
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
    // Heure de fin = début + 1h par défaut
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
      date: l.date, projetId: l.projetId, projetNom: l.projetNom,
      activiteId: l.activiteId, activiteNom: l.activiteNom,
      clientId: l.clientId, clientNom: l.clientNom,
      heureDebut: l.heureDebut, heureFin: l.heureFin,
      minutesTravaillees: l.minutesTravaillees,
      minutesSupplementaires: l.minutesSupplementaires,
      commentaire: l.commentaire, estWeekend: l.estWeekend ?? false,
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
    if (!this.canModify()) { this.ui.warning("Vous n'avez pas la permission d'effectuer cette action."); return; }
    if (!this.form.minutesTravaillees || this.form.minutesTravaillees <= 0) {
      this.ui.warning('La durée doit être supérieure à 0.'); return;
    }
    const user = this.selectedUser() ?? this.currentUser();
    if (!user) { this.ui.warning('Utilisateur non identifié.'); return; }

    const projet = this.projets().find(p => p.id === this.form.projetId);
    const act    = this.getActivitesPourForm().find(a => a.id === this.form.activiteId);

    const nouvelleLigne: LigneFeuilleTempsRequest = {
      date: this.form.date,
      projetId: projet?.id, projetNom: projet?.nom,
      activiteId: act?.id,  activiteNom: act?.nom,
      heureDebut: this.form.heureDebut, heureFin: this.form.heureFin,
      minutesTravaillees: this.form.minutesTravaillees, minutesSupplementaires: 0,
      commentaire: this.form.commentaire || undefined,
      estWeekend: FeuilleTempsService.isWeekend(this.form.date)
    };

    this.saving.set(true);
    const mode = this.formulaireMode();

    if (mode === 'ajout') {
      const { ft: ftExist, lundiDate } = this.getOrCreateFeuille(this.form.date);
      if (ftExist) {
        const lignes = [...this.buildLignesExistantes(ftExist), nouvelleLigne];
        this.ftSvc.update(ftExist.id, {
          utilisateurId: user.id, semaineDu: ftExist.semaineDu, semaineAu: ftExist.semaineAu,
          statut: 'BROUILLON', lignes
        }).subscribe({
          next: ft => { this.feuilles.update(fs => fs.map(f => f.id===ft.id ? ft : f)); this.ui.success('Entrée ajoutée ✅'); this.fermerFormulaire(); this.saving.set(false); this.notifierSiAutreUser(this.form.date); },
          error: (err: HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.saving.set(false); }
        });
      } else {
        this.ftSvc.create({
          utilisateurId: user.id, semaineDu: lundiDate,
          semaineAu: FeuilleTempsService.getVendrediSemaine(lundiDate),
          statut: 'BROUILLON', lignes: [nouvelleLigne]
        }).subscribe({
          next: ft => { this.feuilles.update(fs => [...fs, ft]); this.ui.success('Entrée ajoutée ✅'); this.fermerFormulaire(); this.saving.set(false); this.notifierSiAutreUser(this.form.date); },
          error: (err: HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.saving.set(false); }
        });
      }
    } else {
      const edition = this.entreeEnEdition();
      if (!edition) return;
      const ft = this.feuilles().find(f => f.id === edition.feuilleId);
      if (!ft || (ft.statut !== 'BROUILLON' && ft.statut !== 'REJETEE')) {
        this.ui.warning('Cette feuille ne peut pas être modifiée.'); this.saving.set(false); return;
      }
      const lignes = (ft.lignes ?? []).map(l =>
        l.id === edition.id ? nouvelleLigne
        : { date:l.date, projetId:l.projetId, projetNom:l.projetNom, activiteId:l.activiteId,
            activiteNom:l.activiteNom, heureDebut:l.heureDebut, heureFin:l.heureFin,
            minutesTravaillees:l.minutesTravaillees, minutesSupplementaires:l.minutesSupplementaires,
            commentaire:l.commentaire, estWeekend:l.estWeekend ?? false }
      );
      this.ftSvc.update(ft.id, {
        utilisateurId: ft.utilisateurId, semaineDu: ft.semaineDu, semaineAu: ft.semaineAu, statut: ft.statut, lignes
      }).subscribe({
        next: u => { this.feuilles.update(fs => fs.map(f => f.id===u.id ? u : f)); this.ui.success('Entrée modifiée ✅'); this.fermerFormulaire(); this.saving.set(false); this.notifierSiAutreUser(this.form.date); },
        error: (err: HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.saving.set(false); }
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

  // Drag depuis la sidebar — activité récente
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

  // Drop sur un créneau horaire ou une cellule de mois
  // heure = l'heure du slot sur lequel on drop (ex: "10:00")
  // → devient l'heureDebut, heureFin = heureDebut + 1h, durée = 60 min par défaut
  onDrop(event: DragEvent, date: string, heure?: string): void {
    event.preventDefault();

    // ── Drop d'une activité récente ──
    const r = this.draggingRecente();
    if (r) {
      const heureDebut = heure || '09:00';
      const [dh, dm]   = heureDebut.split(':').map(Number);
      const heureFin   = `${String(Math.min(dh+1, 23)).padStart(2,'0')}:${String(dm).padStart(2,'0')}`;

      // Pré-remplir le formulaire avec projet + activité de l'entrée récente
      // Durée par défaut = 1h (pas la durée originale — l'utilisateur ajuste)
      this.form = {
        date,
        projetId:    r.projetId,
        activiteId:  r.activiteId,
        heureDebut,
        heureFin,
        minutesTravaillees: 60, // 1h par défaut
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

    // ── Déplacement d'une entrée existante ──
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

    // ── Helpers avatar ────────────────────────────────────────────────────────
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
}