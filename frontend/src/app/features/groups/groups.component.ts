// src/app/features/admin/groups/groups.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupeService } from '../../services/groupe.service';
import { UserService } from '../../services/user.service';
import { UiService } from '../../services/ui.service';
import { ErrorService } from '../../services/error.service';
import { Groupe, GroupeRequest, MembreInfo } from '../../shared/models/groupe.model';
import { Utilisateur } from '../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.css']
})
export class GroupsComponent implements OnInit {
  private groupeSvc = inject(GroupeService);
  private userSvc   = inject(UserService);
  private errorSvc  = inject(ErrorService);
  readonly ui       = inject(UiService);

  // ── Données ──
  groupes      = signal<Groupe[]>([]);
  utilisateurs = signal<Utilisateur[]>([]);

  // ── State ──
  loading       = signal(true);
  search        = signal('');
  selectedGroupe = signal<Groupe | null>(null);
  showModal      = signal(false);
  editingGroupe  = signal<Groupe | null>(null);
  saving         = signal(false);

  // ── Formulaire ──
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
    const q = this.search().toLowerCase();
    if (!q) return this.groupes();
    return this.groupes().filter(g =>
      g.nom.toLowerCase().includes(q) ||
      (g.description || '').toLowerCase().includes(q)
    );
  });

  // Membres sélectionnés dans le formulaire (pour affichage)
  membresSelectionnes = computed(() => {
    const ids = this.form().membresIds || [];
    return this.utilisateurs().filter(u => ids.includes(u.id));
  });

  // Utilisateurs pas encore dans le groupe en cours d'édition
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
    // Charger le détail avec membres
    this.groupeSvc.getById(g.id).subscribe({
      next: d => this.selectedGroupe.set(d)
    });
  }

  // ── CRUD ──
  openAdd(): void {
    this.editingGroupe.set(null);
    this.form.set({ nom:'', description:'', couleur:'#6366f1', teamLeadId:undefined, actif:true, membresIds:[] });
    this.showModal.set(true);
  }

  openEdit(g: Groupe): void {
    this.editingGroupe.set(g);
    this.form.set({
      nom: g.nom, description: g.description || '', couleur: g.couleur || '#6366f1',
      teamLeadId: g.teamLeadId, actif: g.actif,
      membresIds: g.membres?.map(m => m.id) || []
    });
    this.showModal.set(true);
  }

  save(): void {
    const f = this.form();
    if (!f.nom?.trim()) { this.ui.warning('Le nom du groupe est obligatoire.'); return; }
    this.saving.set(true);
    const editing = this.editingGroupe();
    const obs = editing
      ? this.groupeSvc.update(editing.id, f)
      : this.groupeSvc.create(f);
    obs.subscribe({
      next: () => {
        this.ui.success(editing ? 'Groupe mis à jour.' : 'Groupe créé.');
        this.closeModal();
        this.saving.set(false);
        this.loadAll();
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error(this.errorSvc.parse(err).message);
        this.saving.set(false);
      }
    });
  }

  delete(g: Groupe): void {
    this.ui.confirm({
      title: 'Supprimer le groupe',
      message: `Supprimer "${g.nom}" ? Les membres ne seront pas supprimés.`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        this.groupeSvc.delete(g.id).subscribe({
          next: () => {
            this.ui.success('Groupe supprimé.');
            if (this.selectedGroupe()?.id === g.id) this.selectedGroupe.set(null);
            this.loadAll();
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  closeModal(): void { this.showModal.set(false); this.editingGroupe.set(null); }

  // ── Membres dans le formulaire ──
  addMembreToForm(userId: number): void {
    const current = this.form().membresIds || [];
    if (!current.includes(userId)) {
      this.form.set({ ...this.form(), membresIds: [...current, userId] });
    }
  }

  removeMembreFromForm(userId: number): void {
    const current = this.form().membresIds || [];
    this.form.set({ ...this.form(), membresIds: current.filter(id => id !== userId) });
    // Si le teamLead est retiré, le reset
    if (this.form().teamLeadId === userId) {
      this.form.set({ ...this.form(), teamLeadId: undefined });
    }
  }

  setTeamLeadInForm(userId: number): void {
    this.form.set({ ...this.form(), teamLeadId: userId });
  }

  // ── Retirer un membre du groupe sélectionné (en dehors du modal) ──
  removeMembre(membre: MembreInfo): void {
    const g = this.selectedGroupe();
    if (!g) return;
    this.ui.confirm({
      title: 'Retirer le membre',
      message: `Retirer ${membre.prenom} ${membre.nom} du groupe ?`,
      confirmLabel: 'Retirer', type: 'warning',
      onConfirm: () => {
        this.groupeSvc.removeMembre(g.id, membre.id).subscribe({
          next: updated => {
            this.ui.success('Membre retiré.');
            this.selectedGroupe.set(updated);
            this.loadAll();
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  // ── Helpers ──
  getInitiales(u: Utilisateur): string {
    return `${(u.prenom || '?').charAt(0)}${(u.nom || '').charAt(0)}`.toUpperCase();
  }

  getMembreInitiales(m: MembreInfo): string {
    return `${(m.prenom || '?').charAt(0)}${(m.nom || '').charAt(0)}`.toUpperCase();
  }

  getUserById(id: number): Utilisateur | undefined {
    return this.utilisateurs().find(u => u.id === id);
  }

  isTeamLead(g: Groupe, membreId: number): boolean {
    return g.teamLeadId === membreId;
  }

  getAvatarColor(name: string): string {
    const colors = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6'];
    return colors[(name || '').charCodeAt(0) % colors.length];
  }

  totalMembres = computed(() => {
    const ids = new Set(this.groupes().flatMap(g => g.membres?.map(m => m.id) || []));
    return ids.size;
  });
}