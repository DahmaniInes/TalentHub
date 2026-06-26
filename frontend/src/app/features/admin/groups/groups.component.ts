// src/app/features/admin/groups/groups.component.ts — COMPLET avec permissions
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupeService } from '../../../services/groupe.service';
import { UserService } from '../../../services/user.service';
import { UiService } from '../../../services/ui.service';
import { ErrorService } from '../../../services/error.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { Groupe, GroupeRequest, MembreInfo } from '../../../shared/models/groupe.model';
import { Utilisateur } from '../../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, SlicePipe],
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.css']
})
export class GroupsComponent implements OnInit {
  private groupeSvc = inject(GroupeService);
  private userSvc   = inject(UserService);
  private errorSvc  = inject(ErrorService);
  readonly ui       = inject(UiService);
  // ✅ NOUVEAU
  readonly perms    = inject(PermissionContextService);

  groupes      = signal<Groupe[]>([]);
  utilisateurs = signal<Utilisateur[]>([]);

  loading        = signal(true);
  search         = signal('');
  filterStatut   = signal<'tous' | 'actif' | 'inactif'>('tous');
  selectedGroupe = signal<Groupe | null>(null);
  detailTab      = signal<'membres' | 'infos'>('membres');
  showModal      = signal(false);
  editingGroupe  = signal<Groupe | null>(null);
  saving         = signal(false);

  selectedIds = signal<Set<number>>(new Set());

  pageSize    = signal(10);
  currentPage = signal(1);

  openMenuId = signal<number | null>(null);

  filterPanelOpenG = signal(false);

  form = signal<GroupeRequest>({
    nom: '', description: '', couleur: '#6366f1',
    teamLeadId: undefined, actif: true, membresIds: []
  });

  readonly COULEURS = [
    '#6366f1','#8b5cf6','#c026d3','#ec4899',
    '#ef4444','#f97316','#eab308','#22c55e',
    '#10b981','#06b6d4','#3b82f6','#64748b'
  ];

  filteredGroupes = computed(() => {
    let list = this.groupes();
    const q = this.search().toLowerCase();
    if (q) list = list.filter(g =>
      g.nom.toLowerCase().includes(q) ||
      (g.description || '').toLowerCase().includes(q)
    );
    if (this.filterStatut() === 'actif')   list = list.filter(g => g.actif);
    if (this.filterStatut() === 'inactif') list = list.filter(g => !g.actif);
    return list;
  });

  totalActifs   = computed(() => this.groupes().filter(g => g.actif).length);
  totalInactifs = computed(() => this.groupes().filter(g => !g.actif).length);

  totalMembres = computed(() => {
    const ids = new Set(this.groupes().flatMap(g => g.membres?.map(m => m.id) || []));
    return ids.size;
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredGroupes().length / this.pageSize()))
  );

  pagesArray = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  pagedGroupes = computed(() => {
    const list  = this.filteredGroupes();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  allPageSelected = computed(() => {
    const paged = this.pagedGroupes();
    if (paged.length === 0) return false;
    return paged.every(g => this.selectedIds().has(g.id));
  });

  somePageSelected = computed(() => {
    const paged = this.pagedGroupes();
    return paged.some(g => this.selectedIds().has(g.id)) && !this.allPageSelected();
  });

  selectedCount = computed(() => this.selectedIds().size);

  membresSelectionnes = computed(() => {
    const ids = this.form().membresIds || [];
    return this.utilisateurs().filter(u => ids.includes(u.id));
  });

  utilisateursDispo = computed(() => {
    const ids = new Set(this.form().membresIds || []);
    return this.utilisateurs().filter(u => !ids.has(u.id));
  });

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    this.groupeSvc.getAll().subscribe({
      next: d => { this.groupes.set(d); this.loading.set(false); },
      error: () => { this.ui.error('Erreur chargement groupes.'); this.loading.set(false); }
    });
    this.userSvc.getAllUsers().subscribe({
      next: d => this.utilisateurs.set(d.filter(u => u.actif))
    });
  }

  selectGroupe(g: Groupe): void {
    this.groupeSvc.getById(g.id).subscribe({
      next: d => { this.selectedGroupe.set(d); this.detailTab.set('membres'); }
    });
    this.openMenuId.set(null);
  }

  openAdd(): void {
    if (!this.perms.canCreateTeam()) { this.ui.warning('Permission TEAM_CREATE requise.'); return; }
    this.editingGroupe.set(null);
    this.form.set({ nom:'', description:'', couleur:'#6366f1', teamLeadId:undefined, actif:true, membresIds:[] });
    this.showModal.set(true);
  }

  openEdit(g: Groupe): void {
    if (!this.perms.canUpdateTeam()) { this.ui.warning('Permission TEAM_UPDATE requise.'); return; }
    this.editingGroupe.set(g);
    this.form.set({
      nom: g.nom, description: g.description || '', couleur: g.couleur || '#6366f1',
      teamLeadId: g.teamLeadId, actif: g.actif,
      membresIds: g.membres?.map(m => m.id) || []
    });
    this.showModal.set(true);
    this.openMenuId.set(null);
  }

  save(): void {
    const f = this.form();
    if (!f.nom?.trim()) { this.ui.warning('Le nom du groupe est obligatoire.'); return; }
    this.saving.set(true);
    const editing = this.editingGroupe();
    const obs = editing ? this.groupeSvc.update(editing.id, f) : this.groupeSvc.create(f);
    obs.subscribe({
      next: () => {
        this.ui.success(editing ? 'Équipe mis à jour.' : 'Équipe créé.');
        this.closeModal(); this.saving.set(false); this.loadAll();
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error(this.errorSvc.parse(err).message);
        this.saving.set(false);
      }
    });
  }

  delete(g: Groupe): void {
    if (!this.perms.canDeleteTeam()) { this.ui.warning('Permission TEAM_DELETE requise.'); return; }
    this.ui.confirm({
      title: 'Supprimer l\'équipe',
message: `Êtes-vous sûr de vouloir supprimer l'équipe "${g.nom}" ?`,
confirmLabel: 'Supprimer', type: 'danger',
onConfirm: () => {
        this.groupeSvc.delete(g.id).subscribe({
          next: () => {
            this.ui.success(' supprimé.');
            if (this.selectedGroupe()?.id === g.id) this.selectedGroupe.set(null);
            this.loadAll();
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
    this.openMenuId.set(null);
  }

  closeModal(): void { this.showModal.set(false); this.editingGroupe.set(null); }

  addMembreToForm(userId: number): void {
    if (!userId) return;
    const current = this.form().membresIds || [];
    if (!current.includes(userId))
      this.form.set({ ...this.form(), membresIds: [...current, userId] });
  }

  removeMembreFromForm(userId: number): void {
    const current = this.form().membresIds || [];
    this.form.set({ ...this.form(), membresIds: current.filter(id => id !== userId) });
    if (this.form().teamLeadId === userId)
      this.form.set({ ...this.form(), teamLeadId: undefined });
  }

  setTeamLeadInForm(userId: number): void {
    this.form.set({ ...this.form(), teamLeadId: this.form().teamLeadId === userId ? undefined : userId });
  }

  removeMembre(membre: MembreInfo): void {
    if (!this.perms.canUpdateTeam()) { this.ui.warning('Permission TEAM_UPDATE requise.'); return; }
    const g = this.selectedGroupe();
    if (!g) return;
    this.ui.confirm({
      title: 'Retirer le membre',
      message: `Retirer ${membre.prenom} ${membre.nom} du Équipe ?`,
      confirmLabel: 'Retirer', type: 'warning',
      onConfirm: () => {
        this.groupeSvc.removeMembre(g.id, membre.id).subscribe({
          next: updated => { this.ui.success('Membre retiré.'); this.selectedGroupe.set(updated); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }
  onPageSizeChange(size: number): void { this.pageSize.set(size); this.currentPage.set(1); }
  resetPage(): void { this.currentPage.set(1); }
  minVal(a: number, b: number): number { return Math.min(a, b); }

  toggleSelectAll(): void {
    const paged = this.pagedGroupes();
    if (this.allPageSelected()) {
      const s = new Set(this.selectedIds()); paged.forEach(g => s.delete(g.id)); this.selectedIds.set(s);
    } else {
      const s = new Set(this.selectedIds()); paged.forEach(g => s.add(g.id)); this.selectedIds.set(s);
    }
  }
  toggleSelect(id: number, event: Event): void {
    event.stopPropagation();
    const s = new Set(this.selectedIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedIds.set(s);
  }
  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  clearSelection(): void { this.selectedIds.set(new Set()); }

  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }
  closeMenu(): void { this.openMenuId.set(null); this.filterPanelOpenG.set(false); }

  isTeamLead(g: Groupe, membreId: number): boolean { return g.teamLeadId === membreId; }

  getAvatarColor(name: string): string {
    const colors = ['#c026d3'];
    return colors[(name || '').charCodeAt(0) % colors.length];
  }

  getInitiales(u: Utilisateur): string {
    return `${(u.prenom||'?').charAt(0)}${(u.nom||'').charAt(0)}`.toUpperCase();
  }

  getMembreInitiales(m: MembreInfo): string {
    return `${(m.prenom||'?').charAt(0)}${(m.nom||'').charAt(0)}`.toUpperCase();
  }

  getTeamLeadPhoto(g: Groupe): string | null {
    if (!g.teamLeadId || !g.membres) return null;
    const lead = g.membres.find(m => m.id === g.teamLeadId);
    return (lead as any)?.photoUrl || null;
  }

  getTeamLeadEmail(g: Groupe): string {
    if (!g.teamLeadId) return '';
    const u = this.utilisateurs().find(u => u.id === g.teamLeadId);
    return u?.email || '';
  }

  fmtDate(d?: string | Date): string {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '—';
    const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(date.getDate()).padStart(2,'0')} ${MOIS[date.getMonth()]}, ${date.getFullYear()}`;
  }
}