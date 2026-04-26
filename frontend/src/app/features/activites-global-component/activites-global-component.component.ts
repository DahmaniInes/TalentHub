// activites-global.component.ts — COMPLET avec filtre panel + badges couleurs sémantiques
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActiviteService }       from '../../services/activite.service';
import { StatutActiviteService } from '../../services/statutactivite.service';
import { ProjetService }         from '../../services/projet.service';
import { UserService }           from '../../services/user.service';
import { UiService }             from '../../services/ui.service';
import { ErrorService }          from '../../services/error.service';
import { Activite, ActiviteRequest } from '../../shared/models/activite.model';
import { StatutActivite }        from '../../shared/models/statut-activite.model';
import { Projet }                from '../../shared/models/projet.model';
import { Utilisateur }           from '../../shared/models/utilisateur.model';
import { HttpErrorResponse }     from '@angular/common/http';

type FiltreVue = 'toutes' | 'projet' | 'globales';

@Component({
  selector: 'app-activites-global',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activites-global-component.component.html',
  styleUrls: ['./activites-global-component.component.css']
})
export class ActivitesGlobalComponent implements OnInit {
  private activiteSvc = inject(ActiviteService);
  private nomencSvc   = inject(StatutActiviteService);
  private projetSvc   = inject(ProjetService);
  private userSvc     = inject(UserService);
  private errorSvc    = inject(ErrorService);
  readonly ui         = inject(UiService);
  readonly Math       = Math;

  activites        = signal<Activite[]>([]);
  statutsActivite  = signal<StatutActivite[]>([]);
  projets          = signal<Projet[]>([]);
  utilisateurs     = signal<Utilisateur[]>([]);

  loading          = signal(true);
  showModal        = signal(false);
  editingActivite  = signal<Activite | null>(null);
  selectedActivite = signal<Activite | null>(null);
  detailTab        = signal<'infos' | 'statut'>('infos');

  // ✅ NOUVEAU : signal pour le panel de filtre
  filterPanelOpen  = signal(false);

  search         = signal('');
  filterVue      = signal<FiltreVue>('toutes');
  filterStatut   = signal<number | ''>('');
  filterPriorite = signal<number | ''>('');
  filterProjet   = signal<number | ''>('');

  pageSize    = signal(15);
  currentPage = signal(1);
  openMenuId  = signal<number | null>(null);
  selectedIds = signal<Set<number>>(new Set());

  form = signal<ActiviteRequest>({
    nom: '', description: '', couleur: '#10b981',
    statutActiviteId: 1, typeBudget: 'ILLIMITE',
    visible: true, facturable: true, priorite: 2
  });
  formProjetId = signal<number | null>(null);

  readonly COULEURS  = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#10b981','#06b6d4','#3b82f6','#64748b'];
  readonly PRIORITES = [
    { value: 1, label: 'Basse',   couleur: '#10b981' },
    { value: 2, label: 'Normale', couleur: '#3b82f6' },
    { value: 3, label: 'Haute',   couleur: '#f97316' },
    { value: 4, label: 'Urgente', couleur: '#ef4444' }
  ];

  // ✅ Mapping codes DB → classes CSS sémantiques
  // Correspond aux codes dans statut_tache : A_FAIRE, EN_COURS, EN_REVUE, TERMINE, BLOQUE, ANNULE
  private readonly STATUT_CODE_MAP: Record<string, string> = {
    'A_FAIRE':  'dt-status-a-faire',
    'EN_COURS': 'dt-status-en-cours',
    'EN_REVUE': 'dt-status-en-revue',
    'TERMINE':  'dt-status-termine',
    'BLOQUE':   'dt-status-bloque',
    'ANNULE':   'dt-status-annule',
  };

  filteredActivites = computed(() => {
    let list = this.activites();
    const q  = this.search().toLowerCase();
    if (this.filterVue() === 'projet')   list = list.filter(a => a.projetId != null);
    if (this.filterVue() === 'globales') list = list.filter(a => a.projetId == null);
    if (this.filterStatut())   list = list.filter(a => a.statutActiviteId === +this.filterStatut());
    if (this.filterPriorite()) list = list.filter(a => a.priorite === +this.filterPriorite());
    if (this.filterProjet())   list = list.filter(a => a.projetId === +this.filterProjet());
    if (q) list = list.filter(a =>
      a.nom.toLowerCase().includes(q) ||
      (a.projetNom             || '').toLowerCase().includes(q) ||
      (a.utilisateurNomComplet || '').toLowerCase().includes(q) ||
      (a.numeroActivite        || '').toLowerCase().includes(q)
    );
    return list;
  });

  totalPages     = computed(() => Math.max(1, Math.ceil(this.filteredActivites().length / this.pageSize())));
  pagesArray     = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedActivites = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredActivites().slice(start, start + this.pageSize());
  });

  allPageSelected  = computed(() => { const p = this.pagedActivites(); return p.length > 0 && p.every(a => this.selectedIds().has(a.id)); });
  somePageSelected = computed(() => { const p = this.pagedActivites(); return p.some(a => this.selectedIds().has(a.id)) && !this.allPageSelected(); });
  selectedCount    = computed(() => this.selectedIds().size);
  statsToutes      = computed(() => this.activites().length);
  statsProjet      = computed(() => this.activites().filter(a => a.projetId != null).length);
  statsGlobales    = computed(() => this.activites().filter(a => a.projetId == null).length);

  // ✅ Compteur de filtres actifs (pour la pastille sur l'icône filtre)
  activeFiltersCount = computed(() =>
    [this.filterStatut() ? '1':'', this.filterPriorite() ? '1':'', this.filterProjet() ? '1':'',
     this.filterVue() !== 'toutes' ? '1':'', this.search()]
      .filter(v => !!v).length
  );

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    this.activiteSvc.getAll().subscribe({
      next: d => { this.activites.set(d); this.loading.set(false); },
      error: () => { this.ui.error('Erreur chargement activités.'); this.loading.set(false); }
    });
    this.nomencSvc.getStatutsActivite().subscribe({ next: d => this.statutsActivite.set(d) });
    this.projetSvc.getAll().subscribe({ next: d => this.projets.set(d) });
    this.userSvc.getAllUsers().subscribe({ next: d => this.utilisateurs.set(d) });
  }

  // ✅ Ferme le panel filtre (appelé par (click) global sur le wrapper)
  closeFilterPanel(): void {
    this.filterPanelOpen.set(false);
    this.openMenuId.set(null);
  }

  closeMenu(): void { this.openMenuId.set(null);
    this.filterPanelOpen.set(false);
    
  }

  openDetail(a: Activite): void {
    this.selectedActivite.set(a);
    this.detailTab.set('infos');
    this.openMenuId.set(null);
    this.filterPanelOpen.set(false);
  }

  openAdd(): void {
    this.editingActivite.set(null);
    this.formProjetId.set(null);
    const s = this.statutsActivite()[0];
    this.form.set({ nom:'', description:'', couleur:'#10b981', statutActiviteId:s?.id||1, typeBudget:'ILLIMITE', visible:true, facturable:true, priorite:2 });
    this.showModal.set(true);
  }

  openEdit(a: Activite): void {
    this.editingActivite.set(a);
    this.formProjetId.set(a.projetId || null);
    this.form.set({
      nom:a.nom, description:a.description||'', couleur:a.couleur||'#10b981',
      statutActiviteId:a.statutActiviteId, budget:a.budget, quotaHoraire:a.quotaHoraire,
      typeBudget:a.typeBudget||'ILLIMITE', visible:a.visible, facturable:a.facturable,
      priorite:a.priorite, dateEcheance:a.dateEcheance, heuresEstimees:a.heuresEstimees,
      utilisateurId:a.utilisateurId, projetId:a.projetId||undefined
    });
    this.showModal.set(true);
    this.openMenuId.set(null);
  }

  save(): void {
    const f = { ...this.form(), projetId: this.formProjetId() || undefined };
    if (!f.nom?.trim()) { this.ui.warning('Le nom est obligatoire.'); return; }
    const editing = this.editingActivite();
    const obs = editing ? this.activiteSvc.update(editing.id, f) : this.activiteSvc.create(f);
    obs.subscribe({
      next: () => { this.ui.success(editing ? 'Activité mise à jour.' : 'Activité créée.'); this.closeModal(); this.loadAll(); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  delete(a: Activite): void {
    this.ui.confirm({ title:'Supprimer l\'activité', message:`Supprimer "${a.nom}" ?`, confirmLabel:'Supprimer', type:'danger',
      onConfirm: () => {
        this.activiteSvc.delete(a.id).subscribe({
          next: () => { this.ui.success('Activité supprimée.'); if (this.selectedActivite()?.id===a.id) this.selectedActivite.set(null); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
    this.openMenuId.set(null);
  }

  deleteBulk(): void {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    this.ui.confirm({ title:`Supprimer ${ids.length} activité(s)`, message:`Supprimer définitivement ?`, confirmLabel:'Tout supprimer', type:'danger',
      onConfirm: () => {
        this.activiteSvc.deleteBulk(ids).subscribe({
          next: () => { this.ui.success(`${ids.length} activité(s) supprimée(s).`); this.clearSelection(); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  changerStatut(a: Activite, statutId: number): void {
    this.activiteSvc.changerStatut(a.id, statutId).subscribe({
      next: () => { this.loadAll(); this.selectedActivite.set(null); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  closeModal(): void { this.showModal.set(false); this.editingActivite.set(null); }

  goToPage(p: number): void { if (p>=1 && p<=this.totalPages()) this.currentPage.set(p); }
  onPageSizeChange(s: number): void { this.pageSize.set(s); this.currentPage.set(1); }
  resetPage(): void { this.currentPage.set(1); }
  minVal(a: number, b: number): number { return Math.min(a, b); }

  // ✅ Réinitialiser tous les filtres
  resetFilters(): void {
    this.filterStatut.set('');
    this.filterPriorite.set('');
    this.filterProjet.set('');
    this.filterVue.set('toutes');
    this.search.set('');
    this.resetPage();
  }

  toggleSelectAll(): void {
    const p = this.pagedActivites();
    if (this.allPageSelected()) { const s=new Set(this.selectedIds()); p.forEach(a=>s.delete(a.id)); this.selectedIds.set(s); }
    else { const s=new Set(this.selectedIds()); p.forEach(a=>s.add(a.id)); this.selectedIds.set(s); }
  }
  toggleSelect(id: number, e: Event): void { e.stopPropagation(); const s=new Set(this.selectedIds()); s.has(id)?s.delete(id):s.add(id); this.selectedIds.set(s); }
  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  clearSelection(): void { this.selectedIds.set(new Set()); }
  toggleMenu(id: number, e: Event): void { e.stopPropagation(); this.openMenuId.set(this.openMenuId()===id?null:id); }

  getPrioriteCouleur(p: number): string { return this.PRIORITES.find(pr=>pr.value===p)?.couleur||'#3b82f6'; }
  getPrioriteLabel(p: number): string   { return this.PRIORITES.find(pr=>pr.value===p)?.label||'Normale'; }

  // ✅ Libellé statut depuis la liste chargée
  getStatutLibelle(id?: number): string {
    if (!id) return '—';
    return this.statutsActivite().find(s => s.id === id)?.libelle || '—';
  }

  // ✅ Classe CSS sémantique selon le CODE du statut (A_FAIRE, EN_COURS, etc.)
  // Utilise d'abord le code, sinon le libellé comme fallback
  getStatutBadgeClass(id?: number): string {
    if (!id) return 'dt-badge dt-badge-default';
    const statut = this.statutsActivite().find(s => s.id === id);
    if (!statut) return 'dt-badge dt-badge-default';

    // ✅ Priorité 1 : le CODE exact de la DB (A_FAIRE, EN_COURS, BLOQUE...)
    if (statut.code && this.STATUT_CODE_MAP[statut.code]) {
      return `dt-badge ${this.STATUT_CODE_MAP[statut.code]}`;
    }

    // ✅ Priorité 2 : fallback sur le libellé (pour les codes inconnus)
    const lib = (statut.libelle || '').toLowerCase();
    if (lib.includes('faire'))                    return 'dt-badge dt-status-a-faire';
    if (lib.includes('cours'))                    return 'dt-badge dt-status-en-cours';
    if (lib.includes('revue'))                    return 'dt-badge dt-status-en-revue';
    if (lib.includes('termin') || lib.includes('clôtur')) return 'dt-badge dt-status-termine';
    if (lib.includes('bloqu'))                    return 'dt-badge dt-status-bloque';
    if (lib.includes('annul'))                    return 'dt-badge dt-status-annule';

    // ✅ Priorité 3 : utiliser la couleur du backend via [style] inline
    return 'dt-badge dt-badge-default';
  }

  // Email utilisateur
  getUtilisateurEmail(id?: number): string {
    if (!id) return '';
    return this.utilisateurs().find(u => u.id === id)?.email || '';
  }

  getProgressCouleur(passees?: number, estimees?: number): string {
    if (!estimees || estimees === 0) return '#94a3b8';
    const pct = ((passees || 0) / estimees) * 100;
    if (pct >= 100) return '#ef4444';
    if (pct >= 80)  return '#f59e0b';
    return '#10b981';
  }

  getProgressPct(passees?: number, estimees?: number): number {
    if (!estimees || estimees === 0) return 0;
    return Math.min(100, Math.round(((passees || 0) / estimees) * 100));
  }

  getAvatarColor(name: string): string {
    const colors = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6'];
    return colors[(name || '').charCodeAt(0) % colors.length];
  }

  getInitiales(nom: string): string {
    return (nom || '').split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  }

  fmtDate(d?: string | Date): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '—';
    const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(date.getDate()).padStart(2,'0')} ${MOIS[date.getMonth()]}, ${date.getFullYear()}`;
  }
}