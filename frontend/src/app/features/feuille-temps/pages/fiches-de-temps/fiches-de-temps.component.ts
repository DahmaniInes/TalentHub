// fiches-de-temps.component.ts — CORRIGÉ
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeuilleTempsService } from '../../../../services/feuille-temps.service';
import { UserService } from '../../../../services/user.service';
import { ProjetService } from '../../../../services/projet.service';
import { ActiviteService } from '../../../../services/activite.service';
import { GroupeService } from '../../../../services/groupe.service';
import { UiService } from '../../../../services/ui.service';
import { ErrorService } from '../../../../services/error.service';
import { KeycloakService } from '../../../../services/keycloak.service';
import { PermissionContextService } from '../../../../services/permission-context.service';
import { FeuilleTemps, FeuilleTempsRequest, LigneFeuilleTempsRequest } from '../../../../shared/models/feuille-temps.model';
import { Utilisateur } from '../../../../shared/models/utilisateur.model';
import { Projet } from '../../../../shared/models/projet.model';
import { Activite } from '../../../../shared/models/activite.model';
import { Groupe } from '../../../../shared/models/groupe.model';
import { HttpErrorResponse } from '@angular/common/http';

export interface LigneVue {
  feuilleId: number; ligneIndex: number;
  utilisateurId: number; utilisateurNom: string; utilisateurPhoto?: string;
  date: string; heureDebut?: string; heureFin?: string; dureeMinutes: number;
  clientId?: number; clientNom?: string; projetId?: number; projetNom?: string;
  activiteId?: number; activiteNom?: string; commentaire?: string; statut: string;
}

export interface FormulaireEntree {
  date: string; heureDebut: string; heureFin: string; dureeMinutes: number;
  clientId: number | null; projetId: number | null; activiteId: number | null;
  description: string; utilisateurIds: number[]; groupeIds: number[];
}

@Component({
  selector: 'app-fiches-de-temps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fiches-de-temps.component.html',
  styleUrls: ['./fiches-de-temps.component.css']
})
export class FichesDeTempsComponent implements OnInit {

  private ftSvc       = inject(FeuilleTempsService);
  private userSvc     = inject(UserService);
  private projetSvc   = inject(ProjetService);
  private activiteSvc = inject(ActiviteService);
  private groupeSvc   = inject(GroupeService);
  readonly ui         = inject(UiService);
  private errorSvc    = inject(ErrorService);
  private keycloak    = inject(KeycloakService);
  readonly perms      = inject(PermissionContextService);

  feuilles     = signal<FeuilleTemps[]>([]);
  utilisateurs = signal<Utilisateur[]>([]);
  projets      = signal<Projet[]>([]);
  activites    = signal<Activite[]>([]);
  tousGroupes  = signal<Groupe[]>([]);
  activitesParProjet = signal<Record<number, Activite[]>>({});

  loading      = signal(false);
  saving_modal = signal(false);
  currentUser  = signal<Utilisateur | null>(null);
  currentKcId  = signal<string>('');

  canEditAll   = computed(() => this.perms.can('TS_ALL_UPDATE'));
  canEditGroup = computed(() => this.perms.can('TS_GROUP_UPDATE'));
  canExport    = computed(() => this.perms.can('TS_ALL_EXPORT') || this.perms.can('TS_GROUP_EXPORT') || this.perms.can('TS_OWN_EXPORT'));

  filterUser      = signal(''); filterProjetId  = signal(''); filterActivite  = signal('');
  filterClient    = signal(''); filterDateDu    = signal(''); filterDateAu    = signal('');
  filterStatut    = signal(''); searchText      = signal(''); showFilterPanel = signal(false);

  page     = signal(1);
  pageSize = signal(25);

  selectedIds = signal<Set<string>>(new Set());
  openMenuId  = signal<string | null>(null);
  showAddModal  = signal(false);
  showBulkModal = signal(false);

  emptyForm = (): FormulaireEntree => ({
    date: new Date().toISOString().split('T')[0],
    heureDebut: '08:00', heureFin: '17:00', dureeMinutes: 480,
    clientId: null, projetId: null, activiteId: null,
    description: '', utilisateurIds: [], groupeIds: []
  });

  formSimple = signal<FormulaireEntree>(this.emptyForm());
  formBulk   = signal<FormulaireEntree>(this.emptyForm());

  groupesDisponibles     = computed(() => (this.canEditAll() || this.canEditGroup()) ? this.tousGroupes() : []);
  utilisateursDisponibles = computed(() => {
    if (this.canEditAll() || this.canEditGroup()) return this.utilisateurs();
    const me = this.currentUser(); return me ? [me] : [];
  });

  lignesVue = computed((): LigneVue[] => {
    const result: LigneVue[] = [];
    for (const ft of this.feuilles()) {
      const user = this.utilisateurs().find(u => u.id === ft.utilisateurId);
      for (let i = 0; i < (ft.lignes?.length ?? 0); i++) {
        const l = ft.lignes[i];
        result.push({
          feuilleId: ft.id, ligneIndex: i,
          utilisateurId: ft.utilisateurId,
          utilisateurNom: ft.utilisateurNom || (user as any)?.nomComplet || (''+ft.utilisateurId),
          utilisateurPhoto: (user as any)?.photoUrl,
          date: typeof l.date==='string' ? l.date : String(l.date),
          heureDebut: l.heureDebut, heureFin: l.heureFin,
          dureeMinutes: l.minutesTravaillees + l.minutesSupplementaires,
          clientId: l.clientId, clientNom: l.clientNom,
          projetId: l.projetId, projetNom: l.projetNom,
          activiteId: l.activiteId, activiteNom: l.activiteNom,
          commentaire: l.commentaire, statut: ft.statut,
        });
      }
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  });

  filteredLignes = computed((): LigneVue[] => {
    let list = this.lignesVue();
    const q = this.searchText().toLowerCase();
    if (this.filterUser())     list = list.filter(l => l.utilisateurId === +this.filterUser());
    if (this.filterProjetId()) list = list.filter(l => l.projetId === +this.filterProjetId());
    if (this.filterActivite()) list = list.filter(l => l.activiteId === +this.filterActivite());
    if (this.filterClient())   list = list.filter(l => (l.clientNom||'').toLowerCase().includes(this.filterClient().toLowerCase()));
    if (this.filterDateDu())   list = list.filter(l => l.date >= this.filterDateDu());
    if (this.filterDateAu())   list = list.filter(l => l.date <= this.filterDateAu());
    if (this.filterStatut())   list = list.filter(l => l.statut === this.filterStatut());
    if (q) list = list.filter(l => (l.utilisateurNom||'').toLowerCase().includes(q)||(l.projetNom||'').toLowerCase().includes(q)||(l.activiteNom||'').toLowerCase().includes(q)||(l.clientNom||'').toLowerCase().includes(q)||l.date.includes(q));
    return list;
  });

  pagedLignes  = computed(() => this.filteredLignes().slice((this.page()-1)*this.pageSize(), this.page()*this.pageSize()));
  totalPages   = computed(() => Math.max(1, Math.ceil(this.filteredLignes().length / this.pageSize())));
  pagesArray   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i+1));
  hasFilters   = computed(() => !!(this.filterUser()||this.filterProjetId()||this.filterActivite()||this.filterClient()||this.filterDateDu()||this.filterDateAu()||this.filterStatut()||this.searchText()));
  activeFiltersCount = computed(() => [this.filterUser(),this.filterProjetId(),this.filterActivite(),this.filterClient(),(this.filterDateDu()||this.filterDateAu())?'1':'',this.filterStatut()].filter(Boolean).length);
  allPageSelected    = computed(() => { const p=this.pagedLignes(); return p.length>0&&p.every(l=>this.selectedIds().has(this.ligneKey(l))); });
  somePageSelected   = computed(() => { const p=this.pagedLignes(); return p.some(l=>this.selectedIds().has(this.ligneKey(l)))&&!this.allPageSelected(); });
  selectedCount      = computed(() => this.selectedIds().size);
  totalHeuresFiltrees = computed(() => this.filteredLignes().reduce((s,l)=>s+l.dureeMinutes,0));

  activitesFormSimple = computed(() => {
    const pid = this.formSimple().projetId;
    const g = this.activites().filter(a => a.estGlobale);
    return pid ? [...(this.activitesParProjet()[pid]??[]),...g] : g;
  });
  activitesFormBulk = computed(() => {
    const pid = this.formBulk().projetId;
    const g = this.activites().filter(a => a.estGlobale);
    return pid ? [...(this.activitesParProjet()[pid]??[]),...g] : g;
  });
  utilisateursBulkDispo = computed(() => { const s=new Set(this.formBulk().utilisateurIds); return this.utilisateursDisponibles().filter(u=>!s.has(u.id)); });
  groupesBulkDispo      = computed(() => { const s=new Set(this.formBulk().groupeIds); return this.groupesDisponibles().filter(g=>!s.has(g.id)); });

  readonly fmt = FeuilleTempsService.formatMinutes;

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.currentKcId.set(kcId);
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => { this.currentUser.set(u); this.formSimple.set({...this.formSimple(),utilisateurIds:[u.id]}); this.loadFeuilles(); },
        error: () => this.loadFeuilles()
      });
    } else { this.loadFeuilles(); }
    this.userSvc.getAllUsers().subscribe({ next: d => this.utilisateurs.set(d) });
    this.projetSvc.getAll().subscribe({ next: d => this.projets.set(d) });
    this.activiteSvc.getAll().subscribe({ next: d => this.activites.set(d) });
    this.groupeSvc.getAll().subscribe({ next: d => this.tousGroupes.set(d) });
  }

  private loadFeuilles(): void {
    this.loading.set(true);
    const obs = this.canEditAll() ? this.ftSvc.getAll() : this.ftSvc.getByUtilisateur(this.currentUser()?.id??0);
    obs.subscribe({ next: d => { this.feuilles.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  private loadActivitesDuProjet(pid: number): void {
    if (this.activitesParProjet()[pid]) return;
    this.activiteSvc.getByProjet(pid).subscribe({ next: d => this.activitesParProjet.update(m=>({...m,[pid]:d})) });
  }

  openAddSimple(): void {
    const me = this.currentUser();
    this.formSimple.set({...this.emptyForm(), utilisateurIds: me?[me.id]:[]});
    this.showAddModal.set(true);
  }

  onProjetChangeSimple(val: string): void {
    const pid = val?+val:null;
    this.formSimple.set({...this.formSimple(),projetId:pid,activiteId:null});
    if (pid) this.loadActivitesDuProjet(pid);
  }

  onHeuresChangeSimple(): void {
    this.formSimple.set({...this.formSimple(),dureeMinutes:this.calcDuree(this.formSimple().heureDebut,this.formSimple().heureFin)});
  }

  setUserSimple(val: string): void {
    const uid = val?+val:null;
    this.formSimple.set({...this.formSimple(),utilisateurIds:uid?[uid]:[]});
  }

  saveSimple(): void {
    const f = this.formSimple();
    if (!f.date) { this.ui.warning('Date obligatoire.'); return; }
    if (f.dureeMinutes<=0) { this.ui.warning('Renseignez les heures.'); return; }
    if (!f.utilisateurIds.length) { this.ui.warning('Sélectionnez un utilisateur.'); return; }
    this.saving_modal.set(true);
    this.saveEntreeForUsers(f, f.utilisateurIds, () => { this.showAddModal.set(false); this.saving_modal.set(false); this.ui.success('Entrée ajoutée.'); this.loadFeuilles(); });
  }

  openAddBulk(): void { this.formBulk.set(this.emptyForm()); this.showBulkModal.set(true); }

  onProjetChangeBulk(val: string): void {
    const pid = val?+val:null;
    this.formBulk.set({...this.formBulk(),projetId:pid,activiteId:null});
    if (pid) this.loadActivitesDuProjet(pid);
  }

  onHeuresChangeBulk(): void {
    this.formBulk.set({...this.formBulk(),dureeMinutes:this.calcDuree(this.formBulk().heureDebut,this.formBulk().heureFin)});
  }

  addUserToBulk(val: string): void {
    const uid=val?+val:0; if(!uid) return;
    const cur=this.formBulk().utilisateurIds;
    if(!cur.includes(uid)) this.formBulk.set({...this.formBulk(),utilisateurIds:[...cur,uid]});
  }
  removeUserFromBulk(uid: number): void { this.formBulk.set({...this.formBulk(),utilisateurIds:this.formBulk().utilisateurIds.filter(i=>i!==uid)}); }
  addGroupeToBulk(val: string): void {
    const gid=val?+val:0; if(!gid) return;
    const cur=this.formBulk().groupeIds;
    if(!cur.includes(gid)) this.formBulk.set({...this.formBulk(),groupeIds:[...cur,gid]});
  }
  removeGroupeFromBulk(gid: number): void { this.formBulk.set({...this.formBulk(),groupeIds:this.formBulk().groupeIds.filter(i=>i!==gid)}); }

  saveBulk(): void {
    const f=this.formBulk();
    if (!f.date) { this.ui.warning('Date obligatoire.'); return; }
    if (f.dureeMinutes<=0) { this.ui.warning('Renseignez les heures.'); return; }
    const userIds=this.resolveUserIds(f.groupeIds,f.utilisateurIds);
    if (!userIds.length) { this.ui.warning('Sélectionnez au moins un utilisateur ou groupe.'); return; }
    this.saving_modal.set(true);
    this.saveEntreeForUsers(f, userIds, () => { this.showBulkModal.set(false); this.saving_modal.set(false); this.ui.success('Entrée ajoutée pour '+userIds.length+' utilisateur(s).'); this.loadFeuilles(); });
  }

  private resolveUserIds(groupeIds: number[], userIds: number[]): number[] {
    const set=new Set<number>(userIds);
    for (const gid of groupeIds) {
      const g=this.tousGroupes().find(x=>x.id===gid);
      if (g?.membres) for (const m of g.membres as any[]) if (m.id) set.add(m.id);
    }
    return Array.from(set);
  }

  private saveEntreeForUsers(f: FormulaireEntree, userIds: number[], onDone: () => void): void {
    const duree=f.dureeMinutes>0?f.dureeMinutes:this.calcDuree(f.heureDebut,f.heureFin);
    const lundi=FeuilleTempsService.getLundiSemaine(new Date(f.date));
    let remaining=userIds.length;
    const ligne: LigneFeuilleTempsRequest = {
      date:f.date, heureDebut:f.heureDebut||undefined, heureFin:f.heureFin||undefined,
      minutesTravaillees:duree, minutesSupplementaires:0,
      projetId:f.projetId??undefined, activiteId:f.activiteId??undefined,
      commentaire:f.description||undefined, estWeekend:FeuilleTempsService.isWeekend(f.date)
    };
    for (const uid of userIds) {
      this.ftSvc.getByUtilisateur(uid).subscribe({
        next: feuilles => {
          const ex=feuilles.find(ft=>ft.semaineDu===lundi);
          if (ex) {
            const req: FeuilleTempsRequest = {
              utilisateurId:uid, semaineDu:ex.semaineDu, semaineAu:ex.semaineAu,
              statut:(ex.statut==='BROUILLON'||ex.statut==='REJETEE')?ex.statut:'BROUILLON',
              commentaireEmploye:ex.commentaireEmploye||'',
              lignes:[...(ex.lignes??[]).map(l=>({
                date:typeof l.date==='string'?l.date:String(l.date),
                projetId:l.projetId,activiteId:l.activiteId,clientId:l.clientId,clientNom:l.clientNom,
                heureDebut:l.heureDebut,heureFin:l.heureFin,
                minutesTravaillees:l.minutesTravaillees,minutesSupplementaires:l.minutesSupplementaires,
                commentaire:l.commentaire,estWeekend:l.estWeekend
              })),ligne]
            };
            this.ftSvc.update(ex.id,req).subscribe({
              next:()=>{ remaining--; if(remaining===0) onDone(); },
              error:(err:HttpErrorResponse)=>{ this.ui.error(this.errorSvc.parse(err).message); remaining--; if(remaining===0) onDone(); }
            });
          } else {
            const req: FeuilleTempsRequest = {
              utilisateurId:uid, semaineDu:lundi, semaineAu:FeuilleTempsService.getVendrediSemaine(lundi),
              statut:'BROUILLON', commentaireEmploye:'', lignes:[ligne]
            };
            this.ftSvc.create(req).subscribe({
              next:()=>{ remaining--; if(remaining===0) onDone(); },
              error:(err:HttpErrorResponse)=>{ this.ui.error(this.errorSvc.parse(err).message); remaining--; if(remaining===0) onDone(); }
            });
          }
        },
        error:(err:HttpErrorResponse)=>{ this.ui.error(this.errorSvc.parse(err).message); remaining--; if(remaining===0) onDone(); }
      });
    }
  }

  // ── Helpers formulaire Simple ──
  onDateChangeSimple(val: string): void {
    this.formSimple.set({ ...this.formSimple(), date: val });
  }
  onHeureDebutChangeSimple(val: string): void {
    this.formSimple.set({ ...this.formSimple(), heureDebut: val });
    this.onHeuresChangeSimple();
  }
  onHeureFinChangeSimple(val: string): void {
    this.formSimple.set({ ...this.formSimple(), heureFin: val });
    this.onHeuresChangeSimple();
  }
  onDureeChangeSimple(val: number): void {
    this.formSimple.set({ ...this.formSimple(), dureeMinutes: val });
  }
  onActiviteChangeSimple(val: string): void {
    const aid = val ? +val : null;
    this.formSimple.set({ ...this.formSimple(), activiteId: aid });
  }
  onDescriptionChangeSimple(val: string): void {
    this.formSimple.set({ ...this.formSimple(), description: val });
  }

  // ── Helpers formulaire Bulk ──
  onDateChangeBulk(val: string): void {
    this.formBulk.set({ ...this.formBulk(), date: val });
  }
  onHeureDebutChangeBulk(val: string): void {
    this.formBulk.set({ ...this.formBulk(), heureDebut: val });
    this.onHeuresChangeBulk();
  }
  onHeureFinChangeBulk(val: string): void {
    this.formBulk.set({ ...this.formBulk(), heureFin: val });
    this.onHeuresChangeBulk();
  }
  onDureeChangeBulk(val: number): void {
    this.formBulk.set({ ...this.formBulk(), dureeMinutes: val });
  }
  onActiviteChangeBulk(val: string): void {
    const aid = val ? +val : null;
    this.formBulk.set({ ...this.formBulk(), activiteId: aid });
  }
  onDescriptionChangeBulk(val: string): void {
    this.formBulk.set({ ...this.formBulk(), description: val });
  }

  // ── Tableau ──
  ligneKey(l:LigneVue):string { return l.feuilleId+'-'+l.ligneIndex; }
  isSelected(l:LigneVue):boolean { return this.selectedIds().has(this.ligneKey(l)); }
  toggleSelect(l:LigneVue,e:Event):void { e.stopPropagation(); const s=new Set(this.selectedIds()),k=this.ligneKey(l); s.has(k)?s.delete(k):s.add(k); this.selectedIds.set(s); }
  toggleSelectAll():void { const p=this.pagedLignes(); if(this.allPageSelected()){const s=new Set(this.selectedIds());p.forEach(l=>s.delete(this.ligneKey(l)));this.selectedIds.set(s);}else{const s=new Set(this.selectedIds());p.forEach(l=>s.add(this.ligneKey(l)));this.selectedIds.set(s);} }
  clearSelection():void { this.selectedIds.set(new Set()); }
  supprimerSelection():void { this.ui.confirm({title:'Supprimer',message:'Supprimer '+this.selectedCount()+' entrée(s) ?',confirmLabel:'Supprimer',type:'danger',onConfirm:()=>{this.ui.warning('Suppression bulk via backend requise.');this.clearSelection();}}); }

  toggleMenu(key:string,e:Event):void { e.stopPropagation(); this.openMenuId.set(this.openMenuId()===key?null:key); }
  closeAllMenus():void { this.openMenuId.set(null); this.showFilterPanel.set(false); }
  resetFilters():void { this.filterUser.set('');this.filterProjetId.set('');this.filterActivite.set('');this.filterClient.set('');this.filterDateDu.set('');this.filterDateAu.set('');this.filterStatut.set('');this.searchText.set('');this.page.set(1); }
  goToPage(p:number):void { if(p>=1&&p<=this.totalPages()) this.page.set(p); }
  minVal(a:number,b:number):number { return Math.min(a,b); }
  calcDuree(debut?:string,fin?:string):number { if(!debut||!fin) return 0; const [dh,dm]=debut.split(':').map(Number),[fh,fm]=fin.split(':').map(Number); return Math.max(0,(fh*60+fm)-(dh*60+dm)); }
  fmtDate(d:string):string { if(!d) return '—'; const dt=new Date(d),M=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']; return String(dt.getDate()).padStart(2,'0')+' '+M[dt.getMonth()]+', '+dt.getFullYear(); }
  fmtDuree(min:number):string { if(!min||min<=0) return '—'; const h=Math.floor(min/60),m=min%60; return m>0?h+'h'+String(m).padStart(2,'0'):h+'h'; }
  getInitiales(nom?:string):string { if(!nom) return '?'; const p=nom.trim().split(' '); return p.length>=2?(p[0][0]+p[p.length-1][0]).toUpperCase():nom.substring(0,2).toUpperCase(); }
  getAvatarColor(nom:string):string { const c=['#6366f1','#8b5cf6','#c026d3','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6']; return c[(nom||'').charCodeAt(0)%c.length]; }
  getUserNom(uid:number):string { const u=this.utilisateurs().find(x=>x.id===uid); return u?(u.prenom||'')+' '+(u.nom||''):'#'+uid; }
  getGroupeNom(gid:number):string { return this.tousGroupes().find(g=>g.id===gid)?.nom||'#'+gid; }
  exportCSV():void {
    const h=['Utilisateur','Date','Début','Fin','Durée','Client','Projet','Activité','Description'];
    const rows=this.filteredLignes().map(l=>[l.utilisateurNom,this.fmtDate(l.date),l.heureDebut||'',l.heureFin||'',this.fmtDuree(l.dureeMinutes),l.clientNom||'',l.projetNom||'',l.activiteNom||'',l.commentaire||'']);
    const csv=[h,...rows].map(r=>r.map(c=>'"'+c+'"').join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='fiches-temps-'+new Date().toISOString().split('T')[0]+'.csv';a.click();
  }
}