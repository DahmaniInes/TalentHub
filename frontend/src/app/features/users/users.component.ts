// src/app/features/admin/users/users.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { ProfilService } from '../../services/profil.service';
import { GroupeService } from '../../services/groupe.service';
import { UiService } from '../../services/ui.service';
import { ErrorService } from '../../services/error.service';
import { Utilisateur } from '../../shared/models/utilisateur.model';
import { Profil } from '../../shared/models/profil.model';
import { Groupe } from '../../shared/models/groupe.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  private userSvc   = inject(UserService);
  private profilSvc = inject(ProfilService);
  private groupeSvc = inject(GroupeService);
  private errorSvc  = inject(ErrorService);
  private router    = inject(Router);
  readonly ui       = inject(UiService);

  // ── Données ──
  users   = signal<Utilisateur[]>([]);
  profils = signal<Profil[]>([]);
  groupes = signal<Groupe[]>([]);

  // ── State ──
  loading      = signal(true);
  search       = signal('');
  filterProfil = signal('');
  filterStatut = signal<'tous' | 'actif' | 'inactif'>('tous');
  selectedUser = signal<Utilisateur | null>(null);
  showDetail   = signal(false);
  detailTab    = signal<'infos' | 'groupes' | 'securite'>('infos');
  saving       = signal(false);

  // ── Sélection ──
  selectedIds = signal<Set<number>>(new Set());

  // ── Pagination ──
  pageSize    = signal(10);
  currentPage = signal(1);

  // ── Menu dropdown ──
  openMenuId = signal<number | null>(null);

  // ── Formulaire édition ──
  editForm = signal({
    nom: '', prenom: '', telephone: '', poste: '',
    departement: '', adresse: '', profilId: null as number | null,
    dateFinContrat: ''
  });

  // ── Computed : filtrage ──
  filteredUsers = computed(() => {
    let list = this.users();
    const q = this.search().toLowerCase();
    if (q) list = list.filter(u =>
      u.nomComplet?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.poste || '').toLowerCase().includes(q) ||
      (u.departement || '').toLowerCase().includes(q)
    );
    if (this.filterProfil()) list = list.filter(u => u.profilNom === this.filterProfil());
    if (this.filterStatut() === 'actif')   list = list.filter(u => u.actif);
    if (this.filterStatut() === 'inactif') list = list.filter(u => !u.actif);
    return list;
  });

  // ── Computed : pagination ──
  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize()))
  );

  pagesArray = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  pagedUsers = computed(() => {
    const list  = this.filteredUsers();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  // ── Computed : sélection ──
  allPageSelected = computed(() => {
    const paged = this.pagedUsers();
    if (paged.length === 0) return false;
    return paged.every(u => this.selectedIds().has(u.id));
  });

  somePageSelected = computed(() => {
    const paged = this.pagedUsers();
    return paged.some(u => this.selectedIds().has(u.id)) && !this.allPageSelected();
  });

  selectedCount = computed(() => this.selectedIds().size);

  // ── Computed : groupes de l'user ──
  userGroupes = computed(() => {
    const u = this.selectedUser();
    if (!u) return [];
    return this.groupes().filter(g => g.membres?.some(m => m.id === u.id));
  });

  // ── Stats + profils uniques ──
  statsActifs    = computed(() => this.users().filter(u =>  u.actif).length);
  statsInactifs  = computed(() => this.users().filter(u => !u.actif).length);
  profilsUniques = computed(() =>
    [...new Set(this.users().map(u => u.profilNom).filter(Boolean))]
  );

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    this.userSvc.getAllUsers().subscribe({
      next: d => { this.users.set(d); this.loading.set(false); },
      error: () => { this.ui.error('Erreur chargement utilisateurs.'); this.loading.set(false); }
    });
    this.profilSvc.getAllProfils().subscribe({ next: d => this.profils.set(d) });
    this.groupeSvc.getAll().subscribe({ next: d => this.groupes.set(d) });
  }

  // ── Navigation ──
  goToAdd(): void { this.router.navigate(['/add-user']); }

  // ── Détail ──
  openDetail(user: Utilisateur): void {
    this.selectedUser.set(user);
    this.detailTab.set('infos');
    this.editForm.set({
      nom:            user.nom,
      prenom:         user.prenom,
      telephone:      user.telephone || '',
      poste:          user.poste || '',
      departement:    user.departement || '',
      adresse:        user.adresse || '',
      profilId:       user.profilId || null,
      dateFinContrat: user.dateFinContrat || ''
    });
    this.showDetail.set(true);
    this.openMenuId.set(null);
  }

  closeDetail(): void { this.showDetail.set(false); this.selectedUser.set(null); }

  // ── Sauvegarder ──
  saveUser(): void {
    const u = this.selectedUser();
    if (!u) return;
    this.saving.set(true);
    const f = this.editForm();
    this.userSvc.updateByAdmin(u.id, {
      nom: f.nom, prenom: f.prenom, telephone: f.telephone,
      poste: f.poste, departement: f.departement, adresse: f.adresse,
      profilId: f.profilId, dateFinContrat: f.dateFinContrat || null
    }).subscribe({
      next: (updated: Utilisateur) => {
        this.ui.success('Utilisateur mis à jour.');
        this.saving.set(false);
        this.loadAll();
        this.selectedUser.set(updated);
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error(this.errorSvc.parse(err).message);
        this.saving.set(false);
      }
    });
  }

  // ── Toggle actif ──
  toggleActif(user: Utilisateur): void {
    const action = user.actif ? 'désactiver' : 'activer';
    this.ui.confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} l'utilisateur`,
      message: `Voulez-vous ${action} "${user.nomComplet}" ?`,
      confirmLabel: action.charAt(0).toUpperCase() + action.slice(1),
      type: user.actif ? 'danger' : 'info',
      onConfirm: () => {
        this.userSvc.toggleActif(user.id).subscribe({
          next: () => {
            this.ui.success(`Utilisateur ${user.actif ? 'désactivé' : 'activé'}.`);
            this.loadAll();
            if (this.selectedUser()?.id === user.id) this.closeDetail();
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  // ── Supprimer ──
  deleteUser(user: Utilisateur): void {
    this.ui.confirm({
      title: 'Supprimer l\'utilisateur',
      message: `Supprimer définitivement "${user.nomComplet}" ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        this.userSvc.deleteUser(user.id).subscribe({
          next: () => { this.ui.success('Utilisateur supprimé.'); this.closeDetail(); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  // ── Reset password ──
  resetPassword(user: Utilisateur): void {
    this.ui.confirm({
      title: 'Réinitialiser le mot de passe',
      message: `Un email de réinitialisation sera envoyé à "${user.email}".`,
      confirmLabel: 'Envoyer', type: 'warning',
      onConfirm: () => {
        this.userSvc.resetPassword(user.id).subscribe({
          next: () => this.ui.success('Email envoyé.'),
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  // ── Pagination ──
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void { this.pageSize.set(size); this.currentPage.set(1); }
  resetPage(): void { this.currentPage.set(1); }
  minVal(a: number, b: number): number { return Math.min(a, b); }

  // ── Sélection ──
  toggleSelectAll(): void {
    const paged = this.pagedUsers();
    if (this.allPageSelected()) {
      const s = new Set(this.selectedIds()); paged.forEach(u => s.delete(u.id)); this.selectedIds.set(s);
    } else {
      const s = new Set(this.selectedIds()); paged.forEach(u => s.add(u.id)); this.selectedIds.set(s);
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

  // ── Menu dropdown ──
  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  closeMenu(): void { this.openMenuId.set(null); }

  // ── Helpers ──
  getInitiales(u: Utilisateur): string {
    return `${(u.prenom || '?').charAt(0)}${(u.nom || '').charAt(0)}`.toUpperCase();
  }

  getAvatarColor(u: Utilisateur): string {
    const colors = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6'];
    return colors[(u.nom || '').charCodeAt(0) % colors.length];
  }
}