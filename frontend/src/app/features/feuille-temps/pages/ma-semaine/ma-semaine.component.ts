// src/app/features/feuille-temps/pages/ma-semaine/ma-semaine.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeuilleTempsService } from '../../../../services/feuille-temps.service';
import { ProjetService }       from '../../../../services/projet.service';
import { ActiviteService }     from '../../../../services/activite.service';
import { UserService }         from '../../../../services/user.service';
import { KeycloakService }     from '../../../../services/keycloak.service';
import { UiService }           from '../../../../services/ui.service';
import { ErrorService }        from '../../../../services/error.service';
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
  readonly ui         = inject(UiService);
  private errorSvc    = inject(ErrorService);

  currentUser     = signal<Utilisateur | null>(null);
  projets         = signal<Projet[]>([]);
  activites       = signal<Activite[]>([]);
  feuilleCourante = signal<FeuilleTemps | null>(null);
  loading         = signal(false);
  saving          = signal(false);

  lundiCourant = signal<string>(FeuilleTempsService.getLundiSemaine());
  datesSemaine = computed(() => FeuilleTempsService.getDatesDesSemaine(this.lundiCourant()));

  lignesMatrice    = signal<MatriceLigne[]>([]);
  commentaireModal = signal<{ rowId: string; date: string } | null>(null);
  commentaireTexte = '';

  readonly JOURS_NOMS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

  // Totaux
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
  peutModifier  = computed(() => {
    const s = this.statutFeuille();
    return !s || s === 'BROUILLON' || s === 'REJETEE';
  });

  // Helpers formatage
  readonly fmt  = FeuilleTempsService.formatMinutes;
  readonly isWE = FeuilleTempsService.isWeekend;

  fmtJourNom(d: string): string { return this.JOURS_NOMS[new Date(d).getDay()]; }
  fmtJourNum(d: string): string { return String(new Date(d).getDate()); }
  isToday(d: string): boolean   { return d === new Date().toISOString().split('T')[0]; }
  fmtDateLabel(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long' });
  }

  // ✅ Affiche "" si 0 min, "1:30" si 90 min
  formatCellDisplay(ligne: MatriceLigne, date: string): string {
    const c = ligne.jours[date];
    const t = c ? c.minutes + c.minutesSupp : 0;
    if (t === 0) return '';
    return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;
  }

  getCellMinutes(ligne: MatriceLigne, date: string): number {
    const c = ligne.jours[date];
    return c ? c.minutes + c.minutesSupp : 0;
  }

  getTotalLigne(rowId: string): number {
    const l = this.lignesMatrice().find(x => x.rowId === rowId);
    if (!l) return 0;
    return Object.values(l.jours).reduce((s, c) => s + c.minutes + c.minutesSupp, 0);
  }

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => { this.currentUser.set(u); this.loadSemaine(); },
        error: () => this.loadSemaine()
      });
    } else { this.loadSemaine(); }
    this.projetSvc.getAll().subscribe({ next: d => this.projets.set(d) });
  }

  loadSemaine(): void {
    const user = this.currentUser();
    if (!user) { this.lignesMatrice.set([this.newLigne()]); return; }
    this.loading.set(true);
    this.ftSvc.getByUtilisateur(user.id).subscribe({
      next: feuilles => {
        const c = feuilles.find(f => f.semaineDu === this.lundiCourant()) ?? null;
        this.feuilleCourante.set(c);
        this.buildMatrice(c);
        this.loading.set(false);
      },
      error: () => { this.buildMatrice(null); this.loading.set(false); }
    });
  }

  buildMatrice(feuille: FeuilleTemps | null): void {
    if (!feuille?.lignes?.length) { this.lignesMatrice.set([this.newLigne()]); return; }
    const g: Record<string, MatriceLigne> = {};
    for (const l of feuille.lignes) {
      const k = `${l.projetId??0}-${l.activiteId??0}`;
      if (!g[k]) g[k] = { rowId:k, projetId:l.projetId, projetNom:l.projetNom, activiteId:l.activiteId, activiteNom:l.activiteNom, clientId:l.clientId, clientNom:l.clientNom, jours:{} };
      g[k].jours[l.date] = { minutes:l.minutesTravaillees, minutesSupp:l.minutesSupplementaires, heureDebut:l.heureDebut||'', heureFin:l.heureFin||'', commentaire:l.commentaire||'', estWeekend:FeuilleTempsService.isWeekend(l.date) };
    }
    this.lignesMatrice.set(Object.values(g));
  }

  newLigne(): MatriceLigne {
    const jours: MatriceLigne['jours'] = {};
    for (const d of FeuilleTempsService.getDatesDesSemaine(this.lundiCourant()))
      jours[d] = { minutes:0, minutesSupp:0, heureDebut:'', heureFin:'', commentaire:'', estWeekend:FeuilleTempsService.isWeekend(d) };
    return { rowId: crypto.randomUUID(), jours };
  }

  ajouterLigne(): void { this.lignesMatrice.update(l => [...l, this.newLigne()]); }

  supprimerDerniereLigne(): void {
    if (this.lignesMatrice().length <= 1) return;
    this.lignesMatrice.update(l => l.slice(0,-1));
  }

  reinitialiser(): void {
    this.ui.confirm({
      title:'Réinitialiser', message:'Remettre toutes les heures à zéro ?',
      confirmLabel:'Réinitialiser', type:'warning',
      onConfirm: () => {
        this.lignesMatrice.update(ls => ls.map(l => {
          const jours = {...l.jours};
          for (const d of Object.keys(jours)) jours[d] = {...jours[d], minutes:0, minutesSupp:0};
          return {...l, jours};
        }));
      }
    });
  }

  onProjetChange(rowId: string, val: string): void {
    const projetId = +val;
    const projet = this.projets().find(p => p.id === projetId);
    this.lignesMatrice.update(ls => ls.map(l =>
      l.rowId !== rowId ? l : { ...l, projetId:projet?.id, projetNom:projet?.nom, clientId:(projet as any)?.clientId, clientNom:projet?.clientNom, activiteId:undefined, activiteNom:undefined }
    ));
    if (projet) this.activiteSvc.getByProjet(projet.id).subscribe({ next: d => this.activites.set(d) });
  }

  onActiviteChange(rowId: string, val: string): void {
    const act = this.activites().find(a => a.id === +val);
    this.lignesMatrice.update(ls => ls.map(l =>
      l.rowId !== rowId ? l : { ...l, activiteId:act?.id, activiteNom:act?.nom }
    ));
  }

  // ✅ Parse "1:30" → 90 min, "2" → 120 min, "1.5" → 90 min
  onDureeChange(rowId: string, date: string, val: string): void {
    const minutes = this.parseHHMM(val.trim());
    this.updateCell(rowId, date, { minutes: Math.min(minutes, 1440), minutesSupp: 0 });
  }

  onCellFocus(event: FocusEvent): void { (event.target as HTMLInputElement).select(); }

  private parseHHMM(val: string): number {
    if (!val || val === '0:00' || val === '0') return 0;
    if (val.includes(':')) {
      const [h, m] = val.split(':').map(n => parseInt(n,10)||0);
      return h*60+m;
    }
    const n = parseFloat(val);
    return isNaN(n) ? 0 : Math.round(n*60);
  }

  private updateCell(rowId: string, date: string, patch: Partial<MatriceLigne['jours'][string]>): void {
    this.lignesMatrice.update(ls => ls.map(l => {
      if (l.rowId !== rowId) return l;
      const def = { minutes:0, minutesSupp:0, heureDebut:'', heureFin:'', commentaire:'', estWeekend:FeuilleTempsService.isWeekend(date) };
      return { ...l, jours: { ...l.jours, [date]: { ...def, ...l.jours[date], ...patch } } };
    }));
  }

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
  }

  hasComment(rowId: string, date: string): boolean {
    return !!this.lignesMatrice().find(l => l.rowId === rowId)?.jours[date]?.commentaire;
  }

  getActivitesDuProjet(projetId?: number): Activite[] {
    if (!projetId) return [];
    return this.activites().filter(a => (a as any).projetId === projetId);
  }

  semainePrec(): void {
    const d = new Date(this.lundiCourant()); d.setDate(d.getDate()-7);
    this.lundiCourant.set(d.toISOString().split('T')[0]); this.loadSemaine();
  }
  semaineSuiv(): void {
    const d = new Date(this.lundiCourant()); d.setDate(d.getDate()+7);
    this.lundiCourant.set(d.toISOString().split('T')[0]); this.loadSemaine();
  }

  get semaineLabelFR(): string {
    const lundi  = this.lundiCourant();
    const samedi = FeuilleTempsService.getSamediSemaine(lundi);
    const f = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' });
    return `${f(lundi)} – ${f(samedi)}`;
  }

  sauvegarder(soumettre = false): void {
    const user = this.currentUser();
    if (!user) { this.ui.warning('Utilisateur non identifié.'); return; }

    const lignes: LigneFeuilleTempsRequest[] = [];
    for (const l of this.lignesMatrice())
      for (const [date, c] of Object.entries(l.jours))
        if (c.minutes > 0 || c.minutesSupp > 0)
          lignes.push({ date, projetId:l.projetId, projetNom:l.projetNom, activiteId:l.activiteId, activiteNom:l.activiteNom, clientId:l.clientId, clientNom:l.clientNom, minutesTravaillees:c.minutes, minutesSupplementaires:c.minutesSupp, commentaire:c.commentaire||undefined, estWeekend:c.estWeekend });

    this.saving.set(true);
    const req: FeuilleTempsRequest = { utilisateurId:user.id, semaineDu:this.lundiCourant(), semaineAu:FeuilleTempsService.getVendrediSemaine(this.lundiCourant()), statut:soumettre?'SOUMISE':'BROUILLON', commentaireEmploye:'', lignes };
    const id  = this.feuilleCourante()?.id;
    const obs = id ? this.ftSvc.update(id, req) : this.ftSvc.create(req);
    obs.subscribe({
      next: ft => { this.feuilleCourante.set(ft); this.buildMatrice(ft); this.ui.success(soumettre?'Feuille soumise ✅':'Sauvegardé 💾'); this.saving.set(false); },
      error: (err: HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.saving.set(false); }
    });
  }

  soumettreFeuille(): void {
    this.ui.confirm({
      title:'Soumettre', message:'Envoyer pour validation ? Vous ne pourrez plus modifier ensuite.',
      confirmLabel:'Soumettre', type:'info',
      onConfirm: () => {
        const id = this.feuilleCourante()?.id;
        if (id) this.ftSvc.soumettre(id).subscribe({ next: ft => { this.feuilleCourante.set(ft); this.ui.success('Feuille soumise ✅'); }, error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message) });
        else this.sauvegarder(true);
      }
    });
  }

  annulerSoumission(): void {
    const id = this.feuilleCourante()?.id;
    if (!id) return;
    this.ftSvc.annulerSoumission(id).subscribe({ next: ft => { this.feuilleCourante.set(ft); this.ui.success('Soumission annulée.'); }, error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message) });
  }
}