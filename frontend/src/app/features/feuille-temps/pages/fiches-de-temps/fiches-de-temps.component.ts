// src/app/features/feuille-temps/pages/fiches-de-temps/fiches-de-temps.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeuilleTempsService } from '../../../../services/feuille-temps.service';
import { UserService }         from '../../../../services/user.service';
import { UiService }           from '../../../../services/ui.service';
import { ErrorService }        from '../../../../services/error.service';
import { KeycloakService }     from '../../../../services/keycloak.service';
import { FeuilleTemps }        from '../../../../shared/models/feuille-temps.model';
import { Utilisateur }         from '../../../../shared/models/utilisateur.model';
import { HttpErrorResponse }   from '@angular/common/http';

@Component({
  selector: 'app-fiches-de-temps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fiches-de-temps.component.html',
  styleUrls: ['./fiches-de-temps.component.css']
})
export class FichesDeTempsComponent implements OnInit {
  private ftSvc    = inject(FeuilleTempsService);
  private userSvc  = inject(UserService);
  private keycloak = inject(KeycloakService);
  readonly ui      = inject(UiService);
  private errorSvc = inject(ErrorService);

  feuilles     = signal<FeuilleTemps[]>([]);
  utilisateurs = signal<Utilisateur[]>([]);
  loading      = signal(false);
  saving       = signal(false);
  currentKcId  = signal<string>('');

  // ── Filtres ──────────────────────────────────────────────────
  filterStatut  = signal('');
  filterUser    = signal('');
  filterDateDu  = signal('');
  filterDateAu  = signal('');
  searchText    = signal('');
  showFilterPanel = signal(false);

  // ── Pagination ───────────────────────────────────────────────
  page     = signal(1);
  pageSize = signal(20);

  // ── Sélection bulk ───────────────────────────────────────────
  selectedIds = signal<Set<number>>(new Set());

  // ── Menus 3-points ───────────────────────────────────────────
  openMenuId = signal<number | null>(null);

  // ── Modal rejet ──────────────────────────────────────────────
  rejetModal = signal<FeuilleTemps | null>(null);
  motifRejet = '';

  readonly fmt = FeuilleTempsService.formatMinutes;

  // ── Computed ─────────────────────────────────────────────────
  filteredFeuilles = computed(() => {
    let list = this.feuilles();
    const q  = this.searchText().toLowerCase();
    if (this.filterStatut()) list = list.filter(f => f.statut === this.filterStatut());
    if (this.filterUser())   list = list.filter(f => f.utilisateurId === +this.filterUser());
    if (this.filterDateDu()) list = list.filter(f => f.semaineDu >= this.filterDateDu());
    if (this.filterDateAu()) list = list.filter(f => f.semaineDu <= this.filterDateAu());
    if (q) list = list.filter(f =>
      (f.utilisateurNom || '').toLowerCase().includes(q) ||
      f.semaineDu.includes(q)
    );
    return list;
  });

  pagedFeuilles = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredFeuilles().slice(start, start + this.pageSize());
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredFeuilles().length / this.pageSize()))
  );

  pagesArray = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1)
  );

  hasFilters = computed(() =>
    !!(this.filterStatut() || this.filterUser() ||
       this.filterDateDu() || this.filterDateAu() || this.searchText())
  );

  activeFiltersCount = computed(() => {
    let n = 0;
    if (this.filterStatut()) n++;
    if (this.filterUser())   n++;
    if (this.filterDateDu() || this.filterDateAu()) n++;
    return n;
  });

  allPageSelected = computed(() => {
    const paged = this.pagedFeuilles();
    if (paged.length === 0) return false;
    return paged.every(f => this.selectedIds().has(f.id));
  });

  somePageSelected = computed(() => {
    const paged = this.pagedFeuilles();
    return paged.some(f => this.selectedIds().has(f.id)) && !this.allPageSelected();
  });

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) this.currentKcId.set(kcId);
    this.loading.set(true);
    this.ftSvc.getAll().subscribe({
      next: d => {
        this.feuilles.set(d.sort((a, b) => b.semaineDu.localeCompare(a.semaineDu)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.userSvc.getAllUsers().subscribe({ next: d => this.utilisateurs.set(d) });
  }

  // ── Helpers ──────────────────────────────────────────────────
  countByStatut(s: string): number {
    return this.feuilles().filter(f => f.statut === s).length;
  }

  minVal(a: number, b: number): number { return Math.min(a, b); }

  getUtilisateur(ft: FeuilleTemps): Utilisateur | undefined {
    return this.utilisateurs().find(u => u.id === ft.utilisateurId);
  }

  getValideurNom(validePar?: string): string {
    if (!validePar) return '—';
    const u = this.utilisateurs().find(u => u.keycloakId === validePar);
    return u ? u.nomComplet || `${u.prenom} ${u.nom}` : validePar.substring(0, 8) + '…';
  }

  getValideurEmail(validePar?: string): string {
    if (!validePar) return '';
    const u = this.utilisateurs().find(u => u.keycloakId === validePar);
    return u?.email || '';
  }

  getInitiales(nom?: string): string {
    if (!nom) return '?';
    const parts = nom.trim().split(' ');
    return parts.length >= 2
      ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase()
      : nom.substring(0, 2).toUpperCase();
  }

  getInitialesUser(u: Utilisateur): string {
    return `${(u.prenom || '?').charAt(0)}${(u.nom || '').charAt(0)}`.toUpperCase();
  }

  resetFilters(): void {
    this.filterStatut.set('');
    this.filterUser.set('');
    this.filterDateDu.set('');
    this.filterDateAu.set('');
    this.searchText.set('');
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.page.set(p);
  }

  closeAllMenus(): void { this.openMenuId.set(null); }

  toggleMenu(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  // ── Sélection ────────────────────────────────────────────────
  isSelected(id: number): boolean { return this.selectedIds().has(id); }

  toggleSelect(id: number, event: Event): void {
    event.stopPropagation();
    const s = new Set(this.selectedIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedIds.set(s);
  }

  toggleSelectAll(): void {
    const paged = this.pagedFeuilles();
    if (this.allPageSelected()) {
      const s = new Set(this.selectedIds());
      paged.forEach(f => s.delete(f.id));
      this.selectedIds.set(s);
    } else {
      const s = new Set(this.selectedIds());
      paged.forEach(f => s.add(f.id));
      this.selectedIds.set(s);
    }
  }

  clearSelection(): void { this.selectedIds.set(new Set()); }

  supprimerSelection(): void {
    const ids = Array.from(this.selectedIds());
    this.ui.confirm({
      title: 'Supprimer les fiches',
      message: `Supprimer ${ids.length} fiche(s) sélectionnée(s) ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        let remaining = ids.length;
        this.saving.set(true);
        ids.forEach(id => {
          this.ftSvc.delete(id).subscribe({
            next: () => {
              this.feuilles.update(fs => fs.filter(f => f.id !== id));
              remaining--;
              if (remaining === 0) {
                this.clearSelection();
                this.saving.set(false);
                this.ui.success('Fiches supprimées.');
              }
            },
            error: (err: HttpErrorResponse) => {
              this.ui.error(this.errorSvc.parse(err).message);
              remaining--;
              if (remaining === 0) this.saving.set(false);
            }
          });
        });
      }
    });
  }

  // ── Actions ──────────────────────────────────────────────────
  valider(ft: FeuilleTemps): void {
    this.ui.confirm({
      title: 'Valider la feuille',
      message: `Valider la feuille du ${ft.semaineDu} ?`,
      confirmLabel: 'Valider', type: 'info',
      onConfirm: () => {
        this.ftSvc.valider(ft.id, this.currentKcId(), '').subscribe({
          next: updated => {
            this.feuilles.update(fs => fs.map(f => f.id === updated.id ? updated : f));
            this.ui.success('Feuille validée ✅');
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  ouvrirRejet(ft: FeuilleTemps): void {
    this.motifRejet = '';
    this.rejetModal.set(ft);
  }

  confirmerRejet(): void {
    const ft = this.rejetModal();
    if (!ft) return;
    if (!this.motifRejet.trim()) { this.ui.warning('Le motif est obligatoire.'); return; }
    this.ftSvc.rejeter(ft.id, this.currentKcId(), this.motifRejet).subscribe({
      next: updated => {
        this.feuilles.update(fs => fs.map(f => f.id === updated.id ? updated : f));
        this.rejetModal.set(null);
        this.ui.success('Feuille rejetée.');
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  dupliquerFiche(ft: FeuilleTemps): void {
    this.ui.warning('Fonctionnalité de duplication à implémenter.');
  }

  supprimerFiche(ft: FeuilleTemps): void {
    this.ui.confirm({
      title: 'Supprimer la fiche',
      message: `Supprimer la fiche de la semaine du ${ft.semaineDu} ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        this.ftSvc.delete(ft.id).subscribe({
          next: () => {
            this.feuilles.update(fs => fs.filter(f => f.id !== ft.id));
            this.ui.success('Fiche supprimée.');
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  exportCSV(): void {
    const header = ['Utilisateur', 'Email', 'Semaine du', 'Semaine au', 'Heures', 'Suppl.', 'Lignes', 'Statut'];
    const rows = this.filteredFeuilles().map(f => {
      const u = this.getUtilisateur(f);
      return [
        f.utilisateurNom || String(f.utilisateurId),
        u?.email || '',
        f.semaineDu, f.semaineAu,
        this.fmt(f.minutesTravaillees),
        this.fmt(f.minutesSupplementaires),
        String(f.lignes?.length || 0),
        f.statut
      ];
    });
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `fiches-temps-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }


  getValideurUsername(validePar?: string): string {
    const email = this.getValideurEmail(validePar);
    if (!email) return '';
    return '@' + email.split('@')[0];
}
}