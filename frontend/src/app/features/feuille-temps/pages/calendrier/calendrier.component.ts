// src/app/features/feuille-temps/pages/calendrier/calendrier.component.ts
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
import { FeuilleTemps, LigneFeuilleTempsRequest } from '../../../../shared/models/feuille-temps.model';
import { Projet }      from '../../../../shared/models/projet.model';
import { Activite }    from '../../../../shared/models/activite.model';
import { Utilisateur } from '../../../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';

export type VueCal = 'mois' | 'semaine' | 'jour';

export interface EntreeCal {
  id?: number;
  feuilleId: number;
  feuilleStatut: string;
  date: string;
  projetId?: number;   projetNom?: string;
  activiteId?: number; activiteNom?: string;
  clientId?: number;   clientNom?: string;
  heureDebut?: string; heureFin?: string;
  minutesTravaillees: number;
  minutesSupplementaires: number;
  commentaire?: string;
  couleur: string;
}

export interface FormulaireEntree {
  date: string;
  projetId?: number;
  activiteId?: number;
  heureDebut: string;
  heureFin: string;
  minutesTravaillees: number;
  commentaire: string;
}

// Activité avec son projet pour la sidebar
interface ActiviteSidebar {
  activite: Activite;
  projet?: Projet;
  couleur: string;
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

  currentUser = signal<Utilisateur | null>(null);
  feuilles    = signal<FeuilleTemps[]>([]);
  projets     = signal<Projet[]>([]);
  activitesGlobales  = signal<Activite[]>([]);
  activitesParProjet = signal<Record<number, Activite[]>>({});
  loading = signal(false);
  saving  = signal(false);

  dateCourante = signal<Date>(new Date());
  vue          = signal<VueCal>('semaine');

  detailEntree    = signal<EntreeCal | null>(null);
  formulaireOpen  = signal(false);
  formulaireMode  = signal<'ajout' | 'edition'>('ajout');
  entreeEnEdition = signal<EntreeCal | null>(null);
  form: FormulaireEntree = this.newForm('', '09:00');

  // Drag depuis la sidebar d'activités
  dragActivite = signal<ActiviteSidebar | null>(null);
  // Drag d'une entrée existante
  dragging = signal<{ entree: EntreeCal; source: string } | null>(null);

  readonly JOURS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  readonly MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  readonly COULEURS = ['#6366f1','#8b5cf6','#10b981','#f97316','#ef4444','#3b82f6','#c026d3','#eab308','#06b6d4','#84cc16'];
  readonly HEURES_JOUR = Array.from({length:24}, (_,i) => `${String(i).padStart(2,'0')}:00`);

  private _couleurs: Record<string,string> = {};
  private _ci = 0;
  couleurProjet(pid?: number): string {
    const k = String(pid ?? '0');
    if (!this._couleurs[k]) this._couleurs[k] = this.COULEURS[this._ci++ % this.COULEURS.length];
    return this._couleurs[k];
  }

  // Sidebar activités groupées par projet
  activitesSidebar = computed((): { projet: Projet | null; activites: ActiviteSidebar[] }[] => {
    const groupes: { projet: Projet | null; activites: ActiviteSidebar[] }[] = [];
    // Activités globales
    const glob = this.activitesGlobales();
    if (glob.length > 0) {
      groupes.push({ projet: null, activites: glob.map(a => ({ activite: a, projet: undefined, couleur: this.couleurProjet(undefined) })) });
    }
    // Par projet
    for (const p of this.projets()) {
      const acts = this.activitesParProjet()[p.id] ?? [];
      if (acts.length > 0) {
        groupes.push({ projet: p, activites: acts.map(a => ({ activite: a, projet: p, couleur: this.couleurProjet(p.id) })) });
      }
    }
    return groupes;
  });

  labelNav = computed(() => {
    const d = this.dateCourante();
    if (this.vue() === 'mois')    return `${this.MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
    if (this.vue() === 'jour')    return d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const lundi = this.lundiDe(d);
    const dim   = new Date(lundi); dim.setDate(dim.getDate()+6);
    return `${lundi.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${dim.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`;
  });

  totalVue = computed(() => {
    const all = this.vue() === 'jour'    ? this.joursJour().flatMap(j=>j.entrees)
              : this.vue() === 'semaine' ? this.joursSemaine().flatMap(j=>j.entrees)
              : this.joursMois().flatMap(j=>j.entrees);
    return all.reduce((s,e)=>s+e.minutesTravaillees+e.minutesSupplementaires,0);
  });

  joursMois = computed(() => {
    const d = this.dateCourante(); const today = new Date().toISOString().split('T')[0];
    const y = d.getFullYear(); const m = d.getMonth();
    const p1 = new Date(y,m,1);
    const off = (p1.getDay()+6)%7;
    const deb = new Date(p1); deb.setDate(deb.getDate()-off);
    const dern = new Date(y,m+1,0);
    const eDay = (dern.getDay()+6)%7;
    const fin  = new Date(dern); if(eDay<6) fin.setDate(fin.getDate()+(6-eDay));
    const jours=[]; const cur=new Date(deb);
    while(cur<=fin){
      const ds=cur.toISOString().split('T')[0];
      jours.push({date:ds,num:cur.getDate(),autreMois:cur.getMonth()!==m,today:ds===today,we:cur.getDay()===0||cur.getDay()===6,entrees:this.entreesDate(ds)});
      cur.setDate(cur.getDate()+1);
    }
    return jours;
  });

  joursSemaine = computed(() => {
    const lundi=this.lundiDe(this.dateCourante()); const today=new Date().toISOString().split('T')[0];
    return Array.from({length:7},(_,i)=>{
      const d=new Date(lundi); d.setDate(d.getDate()+i);
      const ds=d.toISOString().split('T')[0];
      return {date:ds,num:d.getDate(),jourNom:this.JOURS[i],today:ds===today,we:i>=5,entrees:this.entreesDate(ds)};
    });
  });

  joursJour = computed(() => {
    const ds = this.dateCourante().toISOString().split('T')[0];
    return [{date:ds,entrees:this.entreesDate(ds)}];
  });

  entreesDate(date: string): EntreeCal[] {
    const res: EntreeCal[] = [];
    for(const ft of this.feuilles())
      for(const l of ft.lignes||[])
        if(l.date===date)
          res.push({id:l.id,feuilleId:ft.id,feuilleStatut:ft.statut,date,projetId:l.projetId,projetNom:l.projetNom,activiteId:l.activiteId,activiteNom:l.activiteNom,clientId:l.clientId,clientNom:l.clientNom,heureDebut:l.heureDebut,heureFin:l.heureFin,minutesTravaillees:l.minutesTravaillees,minutesSupplementaires:l.minutesSupplementaires,commentaire:l.commentaire,couleur:this.couleurProjet(l.projetId)});
    // Trier par heure
    return res.sort((a,b)=>(a.heureDebut||'00:00').localeCompare(b.heureDebut||'00:00'));
  }

  totalDate(date: string): number {
    return this.entreesDate(date).reduce((s,e)=>s+e.minutesTravaillees+e.minutesSupplementaires,0);
  }

  fmtDuree(min: number): string {
    if(!min && min!==0) return '—';
    return `${Math.floor(min/60)}h${String(min%60).padStart(2,'0')}`;
  }

  fmtHeure(hhmm?: string): string { return hhmm || ''; }

  // Calculer top% d'une entrée dans la vue jour/semaine (8h = 0%, 20h = 100%)
  getTop(heureDebut?: string): number {
    if(!heureDebut) return 0;
    const [h,m] = heureDebut.split(':').map(Number);
    const minutes = h*60+m - 6*60; // commence à 6h
    return Math.max(0, (minutes / (18*60)) * 100); // 18h de plage (6h→24h)
  }

  getHeight(min: number): number {
    return Math.max(2, (min / (18*60)) * 100); // hauteur proportionnelle
  }

  ngOnInit(): void {
    this.projetSvc.getAll().subscribe({
      next: ps => {
        this.projets.set(ps);
        // Charger toutes les activités des projets
        for(const p of ps) this.loadActivitesDuProjet(p.id);
      }
    });
    this.activiteSvc.getAll().subscribe({
      next: (all: Activite[]) => this.activitesGlobales.set(all.filter(a=>!(a as any).projetId))
    });
    const kcId = this.keycloak.getKeycloakUserId();
    if(kcId){
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => { this.currentUser.set(u); this.loadFeuilles(u.id); },
        error: ()  => this.loadFeuilles()
      });
    }
  }

  loadFeuilles(userId?: number): void {
    this.loading.set(true);
    const obs = userId ? this.ftSvc.getByUtilisateur(userId) : this.ftSvc.getAll();
    obs.subscribe({next:d=>{this.feuilles.set(d);this.loading.set(false);},error:()=>this.loading.set(false)});
  }

  loadActivitesDuProjet(projetId: number): void {
    if(this.activitesParProjet()[projetId]) return;
    this.activiteSvc.getByProjet(projetId).subscribe({
      next: d => this.activitesParProjet.update(m=>({...m,[projetId]:d}))
    });
  }

  getActivitesPourForm(): Activite[] {
    const pid = this.form.projetId;
    const glob = this.activitesGlobales();
    if(!pid) return glob;
    const duProjet = (this.activitesParProjet()[pid]??[]).filter(a=>!glob.find(g=>g.id===a.id));
    return [...duProjet,...glob];
  }

  onFormProjetChange(): void {
    this.form.activiteId = undefined;
    if(this.form.projetId) this.loadActivitesDuProjet(this.form.projetId);
  }

  onFormHeuresChange(): void {
    if(this.form.heureDebut && this.form.heureFin){
      const [dh,dm]=this.form.heureDebut.split(':').map(Number);
      const [fh,fm]=this.form.heureFin.split(':').map(Number);
      const tot=(fh*60+fm)-(dh*60+dm);
      if(tot>0) this.form.minutesTravaillees=tot;
    }
  }

  naviguer(delta: number): void {
    const d = new Date(this.dateCourante());
    if(this.vue()==='mois')    d.setMonth(d.getMonth()+delta);
    if(this.vue()==='semaine') d.setDate(d.getDate()+delta*7);
    if(this.vue()==='jour')    d.setDate(d.getDate()+delta);
    this.dateCourante.set(d);
  }

  allerAujourdhui(): void { this.dateCourante.set(new Date()); }
  changerVue(v: VueCal): void { this.vue.set(v); }

  private newForm(date: string, heureDebut = '09:00'): FormulaireEntree {
    const [h,m] = heureDebut.split(':').map(Number);
    const heureFin = `${String(h+1).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    return { date, projetId:undefined, activiteId:undefined, heureDebut, heureFin, minutesTravaillees:60, commentaire:'' };
  }

  // Clic sur un créneau horaire → formulaire avec heure pré-remplie
  ouvrirAjout(date: string, heure?: string): void {
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
    this.form = {
      date: e.date,
      projetId: e.projetId, activiteId: e.activiteId,
      heureDebut: e.heureDebut || '09:00', heureFin: e.heureFin || '10:00',
      minutesTravaillees: e.minutesTravaillees, commentaire: e.commentaire || ''
    };
    if(e.projetId) this.loadActivitesDuProjet(e.projetId);
    this.formulaireMode.set('edition');
    this.entreeEnEdition.set(e);
    this.detailEntree.set(null);
    this.formulaireOpen.set(true);
  }

  fermerFormulaire(): void { this.formulaireOpen.set(false); this.entreeEnEdition.set(null); }
  fermerDetail(): void { this.detailEntree.set(null); }

  // ── Helper: trouver ou créer la feuille de la semaine ──────────────────────
  private getOrCreateFeuille(date: string): { ft: FeuilleTemps | null; lundiDate: string } {
    const user = this.currentUser();
    if(!user) return { ft: null, lundiDate: '' };
    const lundiDate = FeuilleTempsService.getLundiSemaine(new Date(date));
    const ft = this.feuilles().find(f =>
      f.semaineDu === lundiDate &&
      f.utilisateurId === user.id &&
      (f.statut === 'BROUILLON' || f.statut === 'REJETEE')
    ) ?? null;
    return { ft, lundiDate };
  }

  private buildLignesExistantes(ft: FeuilleTemps): LigneFeuilleTempsRequest[] {
    return (ft.lignes||[]).map(l=>({
      date:l.date, projetId:l.projetId, projetNom:l.projetNom,
      activiteId:l.activiteId, activiteNom:l.activiteNom,
      clientId:l.clientId, clientNom:l.clientNom,
      heureDebut:l.heureDebut, heureFin:l.heureFin,
      minutesTravaillees:l.minutesTravaillees,
      minutesSupplementaires:l.minutesSupplementaires,
      commentaire:l.commentaire, estWeekend:l.estWeekend||false
    }));
  }

  sauvegarderFormulaire(): void {
    if(!this.form.minutesTravaillees || this.form.minutesTravaillees<=0){
      this.ui.warning('La durée doit être supérieure à 0.'); return;
    }
    const user = this.currentUser();
    if(!user){ this.ui.warning('Utilisateur non identifié.'); return; }

    const projet  = this.projets().find(p=>p.id===this.form.projetId);
    const act     = this.getActivitesPourForm().find(a=>a.id===this.form.activiteId);
    const mode    = this.formulaireMode();
    const edition = this.entreeEnEdition();

    const nouvelleLigne: LigneFeuilleTempsRequest = {
      date: this.form.date,
      projetId: projet?.id, projetNom: projet?.nom,
      activiteId: act?.id,  activiteNom: act?.nom,
      heureDebut: this.form.heureDebut, heureFin: this.form.heureFin,
      minutesTravaillees: this.form.minutesTravaillees, minutesSupplementaires: 0,
      commentaire: this.form.commentaire||undefined,
      estWeekend: FeuilleTempsService.isWeekend(this.form.date)
    };

    if(mode === 'ajout'){
      const { ft: ftExist, lundiDate } = this.getOrCreateFeuille(this.form.date);
      this.saving.set(true);
      if(ftExist){
        const lignes = [...this.buildLignesExistantes(ftExist), nouvelleLigne];
        // ✅ FIX: utiliser semaineDu existant de la feuille, pas la date de la ligne
        this.ftSvc.update(ftExist.id, {utilisateurId:user.id, semaineDu:ftExist.semaineDu, semaineAu:ftExist.semaineAu, statut:'BROUILLON', lignes}).subscribe({
          next: ft => { this.feuilles.update(fs=>fs.map(f=>f.id===ft.id?ft:f)); this.ui.success('Entrée ajoutée ✅'); this.fermerFormulaire(); this.saving.set(false); },
          error: (err:HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.saving.set(false); }
        });
      } else {
        this.ftSvc.create({utilisateurId:user.id, semaineDu:lundiDate, semaineAu:FeuilleTempsService.getVendrediSemaine(lundiDate), statut:'BROUILLON', lignes:[nouvelleLigne]}).subscribe({
          next: ft => { this.feuilles.update(fs=>[...fs,ft]); this.ui.success('Entrée ajoutée ✅'); this.fermerFormulaire(); this.saving.set(false); },
          error: (err:HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.saving.set(false); }
        });
      }
    } else if(edition){
      const ft = this.feuilles().find(f=>f.id===edition.feuilleId);
      if(!ft) return;
      if(ft.statut!=='BROUILLON' && ft.statut!=='REJETEE'){ this.ui.warning('Cette feuille ne peut pas être modifiée.'); return; }
      const lignes = (ft.lignes||[]).map(l =>
        l.id===edition.id ? nouvelleLigne
        : {date:l.date, projetId:l.projetId, projetNom:l.projetNom, activiteId:l.activiteId, activiteNom:l.activiteNom, heureDebut:l.heureDebut, heureFin:l.heureFin, minutesTravaillees:l.minutesTravaillees, minutesSupplementaires:l.minutesSupplementaires, commentaire:l.commentaire, estWeekend:l.estWeekend||false}
      );
      this.saving.set(true);
      // ✅ FIX: toujours utiliser semaineDu/semaineAu existants
      this.ftSvc.update(ft.id,{utilisateurId:ft.utilisateurId, semaineDu:ft.semaineDu, semaineAu:ft.semaineAu, statut:ft.statut, lignes}).subscribe({
        next: u => { this.feuilles.update(fs=>fs.map(f=>f.id===u.id?u:f)); this.ui.success('Entrée modifiée ✅'); this.fermerFormulaire(); this.saving.set(false); },
        error: (err:HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.saving.set(false); }
      });
    }
  }

  supprimerEntree(e: EntreeCal): void {
    const ft = this.feuilles().find(f=>f.id===e.feuilleId);
    if(!ft || (ft.statut!=='BROUILLON' && ft.statut!=='REJETEE')){ this.ui.warning('Cette feuille ne peut pas être modifiée.'); return; }
    this.ui.confirm({
      title:'Supprimer cette entrée', message:`Supprimer ${e.projetNom||'cette entrée'} du ${e.date} ?`,
      confirmLabel:'Supprimer', type:'danger',
      onConfirm: () => {
        const lignes = (ft.lignes||[]).filter(l=>l.id!==e.id).map(l=>({
          date:l.date, projetId:l.projetId, projetNom:l.projetNom, activiteId:l.activiteId, activiteNom:l.activiteNom,
          heureDebut:l.heureDebut, heureFin:l.heureFin, minutesTravaillees:l.minutesTravaillees,
          minutesSupplementaires:l.minutesSupplementaires, commentaire:l.commentaire, estWeekend:l.estWeekend||false
        }));
        this.ftSvc.update(ft.id,{utilisateurId:ft.utilisateurId,semaineDu:ft.semaineDu,semaineAu:ft.semaineAu,statut:ft.statut,lignes}).subscribe({
          next: u => { this.feuilles.update(fs=>fs.map(f=>f.id===u.id?u:f)); this.ui.success('Entrée supprimée.'); this.fermerDetail(); },
          error: (err:HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  // ── Drag & Drop entrée existante ──────────────────────────────────────────
  peutDrag(e: EntreeCal): boolean { return e.feuilleStatut==='BROUILLON'||e.feuilleStatut==='REJETEE'; }

  onDragStart(event: DragEvent, e: EntreeCal): void {
    if(!this.peutDrag(e)){ event.preventDefault(); return; }
    this.dragging.set({entree:e,source:e.date});
    this.dragActivite.set(null);
    event.dataTransfer?.setData('type','entree');
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); if(event.dataTransfer) event.dataTransfer.dropEffect='move'; }

  // ── Drag depuis sidebar activités ─────────────────────────────────────────
  onSidebarDragStart(event: DragEvent, as: ActiviteSidebar): void {
    this.dragActivite.set(as);
    this.dragging.set(null);
    event.dataTransfer?.setData('type','activite');
  }

  // Drop sur une cellule (date) ou créneau horaire
  onDrop(event: DragEvent, date: string, heure?: string): void {
    event.preventDefault();
    const type = event.dataTransfer?.getData('type');

    // Drop d'une activité depuis la sidebar → ouvrir formulaire
    if(type === 'activite' || this.dragActivite()){
      const as = this.dragActivite();
      if(as){
        this.form = this.newForm(date, heure || '09:00');
        this.form.projetId   = as.projet?.id;
        this.form.activiteId = as.activite.id;
        if(as.projet?.id) this.loadActivitesDuProjet(as.projet.id);
        this.formulaireMode.set('ajout');
        this.entreeEnEdition.set(null);
        this.detailEntree.set(null);
        this.formulaireOpen.set(true);
        this.dragActivite.set(null);
      }
      return;
    }

    // Drop d'une entrée existante → déplacer
    const drag = this.dragging();
    if(!drag || drag.source===date){ this.dragging.set(null); return; }
    const ft = this.feuilles().find(f=>f.id===drag.entree.feuilleId);
    if(!ft){ this.dragging.set(null); return; }
    const lignes = (ft.lignes||[]).map(l=>({
      date:l.id===drag.entree.id?date:l.date,
      projetId:l.projetId, projetNom:l.projetNom, activiteId:l.activiteId, activiteNom:l.activiteNom,
      heureDebut:l.heureDebut, heureFin:l.heureFin, minutesTravaillees:l.minutesTravaillees,
      minutesSupplementaires:l.minutesSupplementaires, commentaire:l.commentaire,
      estWeekend:FeuilleTempsService.isWeekend(l.id===drag.entree.id?date:l.date)
    }));
    this.ftSvc.update(ft.id,{utilisateurId:ft.utilisateurId,semaineDu:ft.semaineDu,semaineAu:ft.semaineAu,statut:ft.statut,lignes}).subscribe({
      next: u => { this.feuilles.update(fs=>fs.map(f=>f.id===u.id?u:f)); this.ui.success('Entrée déplacée ✅'); this.dragging.set(null); },
      error: (err:HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.dragging.set(null); }
    });
  }

  private lundiDe(d: Date): Date {
    const r=new Date(d); r.setDate(r.getDate()-((r.getDay()+6)%7)); return r;
  }

  fmtDateFr(ds: string): string {
    return new Date(ds).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  }
  fmtStatut(s: string): string {
    return ({BROUILLON:'Brouillon',SOUMISE:'Soumise',VALIDEE:'Validée',REJETEE:'Rejetée'} as any)[s]??s;
  }
}