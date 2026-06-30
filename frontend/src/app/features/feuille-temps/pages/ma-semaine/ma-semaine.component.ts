// src/app/features/feuille-temps/pages/ma-semaine/ma-semaine.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeuilleTempsService }     from '../../../../services/feuille-temps.service';
import { ProjetService }           from '../../../../services/projet.service';
import { ActiviteService }         from '../../../../services/activite.service';
import { UserService }             from '../../../../services/user.service';
import { KeycloakService }         from '../../../../services/keycloak.service';
import { UiService }               from '../../../../services/ui.service';
import { ErrorService }            from '../../../../services/error.service';
import { PermissionContextService } from '../../../../services/permission-context.service';
import { NotificationService }     from '../../../../services/notification.service';
import { GroupeService, MembreInfo } from '../../../../services/groupe.service';
import {
  FeuilleTemps, FeuilleTempsRequest,
  LigneFeuilleTempsRequest, MatriceLigne
} from '../../../../shared/models/feuille-temps.model';
import { Projet }      from '../../../../shared/models/projet.model';
import { Activite }    from '../../../../shared/models/activite.model';
import { Utilisateur } from '../../../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-ma-semaine',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ma-semaine.component.html',
  styleUrls: ['./ma-semaine.component.css']
})
export class MaSemaineComponent implements OnInit {

  private ftSvc       = inject(FeuilleTempsService);
  private projetSvc   = inject(ProjetService);
  private activiteSvc = inject(ActiviteService);
  private userSvc     = inject(UserService);
  private keycloak    = inject(KeycloakService);
  private errorSvc    = inject(ErrorService);
  private groupeSvc   = inject(GroupeService);
  private notifSvc    = inject(NotificationService);
  readonly ui         = inject(UiService);
  readonly perms      = inject(PermissionContextService);
  private readonly STATUT_TERMINE_ID = 4;

  // ── Données ──
  currentUser           = signal<Utilisateur | null>(null);
  selectedUser          = signal<Utilisateur | null>(null);

  utilisateursDropdown   = signal<MembreInfo[]>([]);

  projetsVisibles        = signal<Projet[]>([]);
  activitesGlobalesParProjet = signal<Record<number, Activite[]>>({});
  activitesParProjet     = signal<Record<number, Activite[]>>({});
  feuilleCourante        = signal<FeuilleTemps | null>(null);

  loading   = signal(false);
  saving    = signal(false);
  submitted = signal(false);

  dupliquantRowId = signal<string | null>(null);

  lundiCourant = signal<string>(FeuilleTempsService.getLundiSemaine());
  datesSemaine = computed(() => FeuilleTempsService.getDatesDesSemaine(this.lundiCourant()));

  lignesMatrice    = signal<MatriceLigne[]>([]);
  selectedRows     = signal<Set<string>>(new Set());
  commentaireModal = signal<{ rowId: string; date: string } | null>(null);
  commentaireTexte = '';

  readonly JOURS_NOMS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

  // ── Computed permissions ──

  canReadGroup   = computed(() => this.perms.can('TS_GROUP_READ'));
  canUpdateGroup = computed(() => this.perms.can('TS_GROUP_UPDATE'));
  canReadAll     = computed(() => this.perms.can('TS_ALL_READ'));
  canUpdateAll   = computed(() => this.perms.can('TS_ALL_UPDATE'));
  canUpdateOwn   = computed(() => this.perms.can('TS_OWN_UPDATE'));
  canCreateOwn   = computed(() => this.perms.can('TS_OWN_CREATE'));

  showUserSelector = computed(() =>
    this.canReadGroup() || this.canUpdateGroup() || this.canReadAll() || this.canUpdateAll()
  );

  isViewingOwnSheet = computed(() => {
    const me = this.currentUser();
    const sel = this.selectedUser();
    if (!me || !sel) return true;
    return me.id === sel.id;
  });

  peutModifier = computed(() => {
    const statut = this.statutFeuille();
    const bloque = statut === 'SOUMISE' || statut === 'VALIDEE';
    if (bloque) return false;

    if (this.isViewingOwnSheet()) {
      return this.canUpdateOwn() || this.canCreateOwn();
    }
    if (this.canUpdateAll()) return true;
    if (this.canUpdateGroup()) return true;
    return false;
  });

  peutSupprimer = computed(() => {
    if (this.isViewingOwnSheet()) return this.perms.can('TS_OWN_DELETE');
    return this.canUpdateAll() || this.canUpdateGroup();
  });

  totalParJour = computed(() => {
    const t: Record<string, number> = {};
    for (const d of this.datesSemaine()) t[d] = 0;
    for (const l of this.lignesMatrice())
      for (const [d, c] of Object.entries(l.jours))
        if (d in t) t[d] += c.minutes + c.minutesSupp;
    return t;
  });

  totalSemaine  = computed(() => Object.values(this.totalParJour()).reduce((s, v) => s + v, 0));
  statutFeuille = computed(() => this.feuilleCourante()?.statut ?? null);

  allSelected = computed(() => {
    const ls = this.lignesMatrice();
    return ls.length > 0 && ls.every(l => this.selectedRows().has(l.rowId));
  });

  readonly fmt  = FeuilleTempsService.formatMinutes;
  readonly isWE = FeuilleTempsService.isWeekend;

  // ── Lifecycle ──
  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => {
          this.currentUser.set(u);
          this.selectedUser.set(u);
          this.loadUtilisateursDropdown();
          this.loadProjetsVisibles();
          this.loadSemaine();
        },
        error: () => this.loadSemaine()
      });
    } else {
      this.loadSemaine();
    }
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

  private loadProjetsVisibles(): void {
    const me = this.currentUser();
    if (!me) return;
    const sel = this.selectedUser();
    const autreId = sel && sel.id !== me.id ? sel.id : undefined;

    this.projetSvc.getVisiblesPourFeuilleTemps(me.id, autreId).subscribe({
      next: d => this.projetsVisibles.set(d),
      error: () => this.ui.error('Erreur lors du chargement des projets.')
    });
  }

  // ── Changement d'utilisateur ──
  onUserChange(userId: string): void {
    const me = this.currentUser();
    const id = userId ? +userId : null;
    if (!id || (me && id === me.id)) {
      this.selectedUser.set(me);
      this.loadProjetsVisibles();
      this.loadSemaine();
      return;
    }
    this.userSvc.getUserById(id).subscribe({
      next: user => {
        this.selectedUser.set(user);
        this.loadProjetsVisibles();
        this.loadSemaine();
      },
      error: () => this.ui.error("Erreur lors du chargement de l'utilisateur sélectionné.")
    });
  }

  // ── Chargement feuille ──
  loadSemaine(): void {
    const user = this.selectedUser() ?? this.currentUser();
    if (!user) { this.lignesMatrice.set([this.newLigne()]); return; }
    this.loading.set(true);
    this.ftSvc.getByUtilisateur(user.id).subscribe({
      next: feuilles => {
        const c = feuilles.find(f => f.semaineDu === this.lundiCourant()) ?? null;
        this.feuilleCourante.set(c);
        this.buildMatrice(c);
        this.submitted.set(false);
        this.loading.set(false);
      },
      error: () => { this.buildMatrice(null); this.loading.set(false); }
    });
  }

  buildMatrice(feuille: FeuilleTemps | null): void {
    if (!feuille?.lignes?.length) { this.lignesMatrice.set([this.newLigne()]); return; }
    const g: Record<string, MatriceLigne> = {};
    for (const l of feuille.lignes) {
      const k = `${l.projetId ?? 0}-${l.activiteId ?? 0}`;
      if (!g[k]) g[k] = {
        rowId: k,
        projetId: l.projetId, projetNom: l.projetNom,
        activiteId: l.activiteId, activiteNom: l.activiteNom,
        clientId: l.clientId, clientNom: l.clientNom,
        jours: {}
      };
      g[k].jours[l.date] = {
        minutes: l.minutesTravaillees,
        minutesSupp: l.minutesSupplementaires,
        heureDebut: l.heureDebut || '',
        heureFin: l.heureFin || '',
        commentaire: l.commentaire || '',
        estWeekend: FeuilleTempsService.isWeekend(l.date)
      };
    }
    for (const ligne of Object.values(g)) {
      for (const d of FeuilleTempsService.getDatesDesSemaine(this.lundiCourant())) {
        if (!ligne.jours[d]) {
          ligne.jours[d] = { minutes: 0, minutesSupp: 0, heureDebut: '', heureFin: '', commentaire: '', estWeekend: FeuilleTempsService.isWeekend(d) };
        }
      }
    }
    const projetIds = [...new Set(Object.values(g).map(l => l.projetId).filter(Boolean) as number[])];
    for (const pid of projetIds) {
      this.loadActivitesDuProjet(pid);
      this.loadActivitesGlobalesDuProjet(pid);
    }
    this.lignesMatrice.set(Object.values(g));
  }

  newLigne(): MatriceLigne {
    const jours: MatriceLigne['jours'] = {};
    for (const d of FeuilleTempsService.getDatesDesSemaine(this.lundiCourant()))
      jours[d] = { minutes: 0, minutesSupp: 0, heureDebut: '', heureFin: '', commentaire: '', estWeekend: FeuilleTempsService.isWeekend(d) };
    return { rowId: crypto.randomUUID(), jours };
  }

  // ── Actions lignes ──
  ajouterLigne(): void { this.lignesMatrice.update(l => [...l, this.newLigne()]); }

  /**
   * ✅ CORRIGÉ — La suppression déclenche désormais immédiatement une
   * sauvegarde silencieuse côté backend. Avant ce correctif, seule la
   * matrice en mémoire était modifiée : tant que l'utilisateur ne cliquait
   * pas explicitement sur "Sauvegarder", rien n'était persisté et la ligne
   * réapparaissait après actualisation de la page.
   */
  supprimerLignesSelectionnees(): void {
    const sel = this.selectedRows();
    if (sel.size === 0) {
      if (this.lignesMatrice().length <= 1) return;
      this.lignesMatrice.update(l => l.slice(0, -1));
      this.sauvegarder(false, true);
      return;
    }
    this.lignesMatrice.update(ls => ls.filter(l => !sel.has(l.rowId)));
    this.selectedRows.set(new Set());
    this.sauvegarder(false, true);
  }

  /**
   * ✅ CORRIGÉ — Réinitialiser persiste désormais immédiatement l'état
   * vide en base (même raison que supprimerLignesSelectionnees ci-dessus).
   */
  reinitialiser(): void {
    this.ui.confirm({
      title: 'Réinitialiser',
      message: 'Supprimer toutes les lignes et revenir à l\'état initial de la semaine ?',
      confirmLabel: 'Réinitialiser', type: 'warning',
      onConfirm: () => {
        this.lignesMatrice.set([this.newLigne()]);
        this.selectedRows.set(new Set());
        this.sauvegarder(false, true);
      }
    });
  }

  // ── Sélection ──
  toggleRow(rowId: string): void {
    this.selectedRows.update(sel => {
      const next = new Set(sel);
      next.has(rowId) ? next.delete(rowId) : next.add(rowId);
      return next;
    });
  }
  toggleAll(): void {
    this.allSelected()
      ? this.selectedRows.set(new Set())
      : this.selectedRows.set(new Set(this.lignesMatrice().map(l => l.rowId)));
  }
  isRowSelected(rowId: string): boolean { return this.selectedRows().has(rowId); }
  deselectAll(): void { this.selectedRows.set(new Set()); }

  // ── Activités ──
  private loadActivitesDuProjet(projetId: number): void {
    if (this.activitesParProjet()[projetId]) return;
    this.activiteSvc.getByProjet(projetId).subscribe({
      next: d => this.activitesParProjet.update(m => ({ ...m, [projetId]: d }))
    });
  }

  private loadActivitesGlobalesDuProjet(projetId: number): void {
    if (this.activitesGlobalesParProjet()[projetId]) return;
    this.activiteSvc.getGlobalesDisponiblesPourProjet(projetId).subscribe({
      next: d => this.activitesGlobalesParProjet.update(m => ({ ...m, [projetId]: d }))
    });
  }

  /**
   * Liste des activités proposées dans le dropdown — exclut toujours les
   * activités terminées (elles ne doivent jamais être choisies pour une
   * NOUVELLE saisie).
   */
  getActivitesDuProjet(projetId?: number): Activite[] {
    if (!projetId) return [];
    const duProjet = this.activitesParProjet()[projetId] ?? [];
    return duProjet.filter(a => a.statutActiviteId !== this.STATUT_TERMINE_ID);
  }

  getActivitesGlobalesPourProjet(projetId?: number): Activite[] {
    if (!projetId) return [];
    return this.activitesGlobalesParProjet()[projetId] ?? [];
  }

  /**
   * ✅ NOUVEAU — Retrouve l'activité réelle (avec son statut) liée à une
   * ligne, même si elle a été exclue du dropdown car terminée. Permet de
   * savoir si on doit verrouiller la ligne sans jamais perdre le nom déjà
   * affiché.
   */
  private findActiviteReelle(ligne: MatriceLigne): Activite | undefined {
    if (!ligne.activiteId || !ligne.projetId) return undefined;
    const liste = this.activitesParProjet()[ligne.projetId] ?? [];
    return liste.find(a => a.id === ligne.activiteId);
  }

  /**
   * ✅ NOUVEAU — Vrai si l'activité actuellement sélectionnée sur cette
   * ligne a le statut "Terminée". Utilisé pour verrouiller la saisie
   * d'heures sur cette ligne sans supprimer ni masquer son nom.
   */
  ligneActiviteTerminee(ligne: MatriceLigne): boolean {
    const a = this.findActiviteReelle(ligne);
    return a?.statutActiviteId === this.STATUT_TERMINE_ID;
  }

  onProjetChange(rowId: string, val: string): void {
    const projetId = val ? +val : undefined;
    const projet   = this.projetsVisibles().find(p => p.id === projetId);
    this.lignesMatrice.update(ls => ls.map(l =>
      l.rowId !== rowId ? l : {
        ...l,
        projetId:   projet?.id,
        projetNom:  projet?.nom,
        clientId:   undefined,
        clientNom:  undefined,
        activiteId: undefined,
        activiteNom: undefined
      }
    ));
    if (projetId) {
      this.loadActivitesDuProjet(projetId);
      this.loadActivitesGlobalesDuProjet(projetId);
    }
  }

  onActiviteChange(rowId: string, val: string): void {
    const activiteId = val ? +val : undefined;
    if (!activiteId) {
      this.lignesMatrice.update(ls => ls.map(l =>
        l.rowId !== rowId ? l : { ...l, activiteId: undefined, activiteNom: undefined }));
      return;
    }

    const ligne = this.lignesMatrice().find(l => l.rowId === rowId);
    const projetId = ligne?.projetId;
    if (!projetId) return;

    const duProjet = this.activitesParProjet()[projetId] ?? [];
    const dejaLiee = duProjet.find(a => a.id === activiteId);

    if (dejaLiee) {
      this.lignesMatrice.update(ls => ls.map(l =>
        l.rowId !== rowId ? l : { ...l, activiteId: dejaLiee.id, activiteNom: dejaLiee.nom }
      ));
      return;
    }

    const globale = (this.activitesGlobalesParProjet()[projetId] ?? []).find(a => a.id === activiteId);
    if (!globale) return;

    this.dupliquantRowId.set(rowId);
    this.activiteSvc.obtenirOuDupliquerPourProjet(globale.id, projetId).subscribe({
      next: copie => {
        this.dupliquantRowId.set(null);
        this.activitesParProjet.update(m => {
          const liste = m[projetId] ?? [];
          if (liste.some(a => a.id === copie.id)) return m;
          return { ...m, [projetId]: [...liste, copie] };
        });
        this.lignesMatrice.update(ls => ls.map(l =>
          l.rowId !== rowId ? l : { ...l, activiteId: copie.id, activiteNom: copie.nom }
        ));
      },
      error: () => {
        this.dupliquantRowId.set(null);
        this.ui.error("Erreur lors de l'assignation de l'activité globale.");
        this.lignesMatrice.update(ls => ls.map(l =>
          l.rowId !== rowId ? l : { ...l, activiteId: undefined, activiteNom: undefined }
        ));
      }
    });
  }

  onDureeChange(rowId: string, date: string, val: string): void {
    const minutes = this.parseHHMM(val.trim());
    this.updateCell(rowId, date, { minutes: Math.min(minutes, 1440), minutesSupp: 0 });
  }

  onCellFocus(event: FocusEvent): void {
    setTimeout(() => (event.target as HTMLInputElement).select(), 10);
  }

  private parseHHMM(val: string): number {
    if (!val || val === '0:00') return 0;
    if (val.includes(':')) {
      const [h, m] = val.split(':').map(n => parseInt(n, 10) || 0);
      return h * 60 + m;
    }
    const n = parseFloat(val);
    return isNaN(n) ? 0 : Math.round(n * 60);
  }

  private updateCell(rowId: string, date: string, patch: Partial<MatriceLigne['jours'][string]>): void {
    this.lignesMatrice.update(ls => ls.map(l => {
      if (l.rowId !== rowId) return l;
      const def = { minutes: 0, minutesSupp: 0, heureDebut: '', heureFin: '', commentaire: '', estWeekend: FeuilleTempsService.isWeekend(date) };
      return { ...l, jours: { ...l.jours, [date]: { ...def, ...l.jours[date], ...patch } } };
    }));
  }

  // ── Commentaires ──
  ouvrirCommentaire(rowId: string, date: string): void {
    const l = this.lignesMatrice().find(x => x.rowId === rowId);
    this.commentaireTexte = l?.jours[date]?.commentaire ?? '';
    this.commentaireModal.set({ rowId, date });
  }

  sauvegarderCommentaire(): void {
    const m = this.commentaireModal();
    if (!m) return;
    this.updateCell(m.rowId, m.date, { commentaire: this.commentaireTexte });
    this.commentaireModal.set(null);
    this.sauvegarder(false, true);
  }

  hasComment(rowId: string, date: string): boolean {
    return !!(this.lignesMatrice().find(l => l.rowId === rowId)?.jours[date]?.commentaire?.trim());
  }

  // ── Helpers affichage ──
  fmtJourNom(d: string): string { return this.JOURS_NOMS[new Date(d).getDay()]; }
  fmtJourNum(d: string): string { return String(new Date(d).getDate()); }
  isToday(d: string): boolean   { return d === new Date().toISOString().split('T')[0]; }
  fmtDateLabel(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long' });
  }
  formatCellDisplay(ligne: MatriceLigne, date: string): string {
    const c = ligne.jours[date];
    const t = c ? c.minutes + c.minutesSupp : 0;
    return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
  }
  getCellMinutes(ligne: MatriceLigne, date: string): number {
    return ligne.jours[date] ? ligne.jours[date].minutes + ligne.jours[date].minutesSupp : 0;
  }
  getTotalLigne(rowId: string): number {
    const l = this.lignesMatrice().find(x => x.rowId === rowId);
    if (!l) return 0;
    return Object.values(l.jours).reduce((s, c) => s + c.minutes + c.minutesSupp, 0);
  }
  private getLigneTotalMinutes(l: MatriceLigne): number {
    return Object.values(l.jours).reduce((s, c) => s + c.minutes + c.minutesSupp, 0);
  }

  selectedUserLabel = computed(() => {
    const sel = this.selectedUser();
    const me  = this.currentUser();
    if (!sel || !me) return '';
    if (sel.id === me.id) return '';
    return `${sel.prenom || ''} ${sel.nom || ''}`.trim();
  });

  // ── Navigation semaine ──
  semainePrec(): void {
    const d = new Date(this.lundiCourant()); d.setDate(d.getDate() - 7);
    this.lundiCourant.set(d.toISOString().split('T')[0]); this.loadSemaine();
  }
  semaineSuiv(): void {
    const d = new Date(this.lundiCourant()); d.setDate(d.getDate() + 7);
    this.lundiCourant.set(d.toISOString().split('T')[0]); this.loadSemaine();
  }
  get semaineLabelFR(): string {
    const lundi  = this.lundiCourant();
    const samedi = FeuilleTempsService.getSamediSemaine(lundi);
    const f = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    return `${f(lundi)} – ${f(samedi)}`;
  }

  sauvegarder(soumettre = false, silencieux = false): void {
    const targetUser = this.selectedUser() ?? this.currentUser();
    const me = this.currentUser();
    if (!targetUser) { this.ui.warning("Utilisateur non identifié."); return; }

    const lignesAvecHeures = this.lignesMatrice().filter(l => this.getLigneTotalMinutes(l) > 0);
    const lignesSansProjet   = lignesAvecHeures.filter(l => !l.projetId);
    const lignesSansActivite = lignesAvecHeures.filter(l => l.projetId && !l.activiteId);

    if (lignesSansProjet.length > 0) {
      this.ui.warning("⚠️ Un projet doit être sélectionné pour chaque ligne saisie.");
      this.submitted.set(true);
      return;
    }
    if (lignesSansActivite.length > 0) {
      this.ui.warning("⚠️ Une activité doit être sélectionnée pour chaque ligne avec un projet.");
      this.submitted.set(true);
      return;
    }

    const lignes: LigneFeuilleTempsRequest[] = [];
    for (const l of this.lignesMatrice()) {
      for (const [date, c] of Object.entries(l.jours)) {
        if (c.minutes > 0 || c.minutesSupp > 0) {
          lignes.push({
            date,
            projetId:   l.projetId,
            activiteId: l.activiteId,
            clientId:   l.clientId,
            minutesTravaillees:     c.minutes,
            minutesSupplementaires: c.minutesSupp,
            commentaire: c.commentaire?.trim() || undefined,
            estWeekend:  c.estWeekend
          });
        }
      }
    }

    this.saving.set(true);

    const req: FeuilleTempsRequest = {
      utilisateurId: targetUser.id,
      semaineDu: this.lundiCourant(),
      semaineAu: this.feuilleCourante()?.semaineAu
                 ?? FeuilleTempsService.getVendrediSemaine(this.lundiCourant()),
      statut: soumettre ? 'SOUMISE' : 'BROUILLON',
      commentaireEmploye: this.feuilleCourante()?.commentaireEmploye || '',
      lignes
    };

    const id  = this.feuilleCourante()?.id;
    const obs = id ? this.ftSvc.update(id, req) : this.ftSvc.create(req);
    const isModifyingOther = me && targetUser && me.id !== targetUser.id;

    obs.subscribe({
      next: ft => {
        this.feuilleCourante.set(ft);
        this.buildMatrice(ft);
        if (!silencieux) {
          this.ui.success(soumettre ? 'Feuille soumise ✅' : 'Sauvegardé 💾');
        }
        this.saving.set(false);
        this.submitted.set(false);
        if (isModifyingOther && targetUser.keycloakId) {
          const nomMod = `${me!.prenom || ''} ${me!.nom || ''}`.trim() || 'Un administrateur';
          this.ftSvc.notifierModification(targetUser.keycloakId, nomMod, this.lundiCourant())
              .subscribe({ error: () => {} });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error(this.errorSvc.parse(err).message);
        this.saving.set(false);
      }
    });
  }

  soumettreFeuille(): void {
    this.ui.confirm({
      title: 'Soumettre',
      message: 'Envoyer pour validation ? Vous ne pourrez plus modifier ensuite.',
      confirmLabel: 'Soumettre', type: 'info',
      onConfirm: () => {
        const id = this.feuilleCourante()?.id;
        if (id) {
          this.ftSvc.soumettre(id).subscribe({
            next: ft => { this.feuilleCourante.set(ft); this.ui.success('Feuille soumise ✅'); },
            error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
          });
        } else {
          this.sauvegarder(true);
        }
      }
    });
  }

  annulerSoumission(): void {
    const id = this.feuilleCourante()?.id;
    if (!id) return;
    this.ftSvc.annulerSoumission(id).subscribe({
      next: ft => { this.feuilleCourante.set(ft); this.ui.success('Soumission annulée.'); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }


  /**
 * ✅ Vrai si on doit bloquer la SAISIE sur cette cellule précise : ligne
 * dont l'activité est terminée ET cellule actuellement vide (0 minute).
 * Une cellule qui contient déjà des heures reste éditable (modification
 * ou suppression), seul l'AJOUT de nouvelles heures est interdit.
 */
celluleAjoutInterdit(ligne: MatriceLigne, date: string): boolean {
  return this.ligneActiviteTerminee(ligne) && this.getCellMinutes(ligne, date) === 0;
}
}