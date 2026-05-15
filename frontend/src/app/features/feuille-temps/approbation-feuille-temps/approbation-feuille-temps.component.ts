// approbation-feuille-temps.component.ts — COMPLET FINAL
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FeuilleTempsService }      from '../../../services/feuille-temps.service';
import { UserService }              from '../../../services/user.service';
import { KeycloakService }          from '../../../services/keycloak.service';
import { ErrorService }             from '../../../services/error.service';
import { UiService }                from '../../../services/ui.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { FeuilleTemps }             from '../../../shared/models/feuille-temps.model';
import { Utilisateur }              from '../../../shared/models/utilisateur.model';

@Component({
  selector: 'app-approbation-feuille-temps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approbation-feuille-temps.component.html',
  styleUrls: ['./approbation-feuille-temps.component.css']
})
export class ApprobationFeuilleTempsComponent implements OnInit {

  private ftSvc    = inject(FeuilleTempsService);
  private userSvc  = inject(UserService);
  private keycloak = inject(KeycloakService);
  private errorSvc = inject(ErrorService);
  readonly ui      = inject(UiService);
  readonly perms   = inject(PermissionContextService);
  private router   = inject(Router);

  feuilles       = signal<FeuilleTemps[]>([]);
  utilisateurs   = signal<Utilisateur[]>([]);
  feuilleDetail  = signal<FeuilleTemps | null>(null);
  currentKcId    = signal<string>('');
  loading        = signal(false);
  motifRejet     = '';
  showRejetModal = signal(false);
  openMenuId     = signal<number | null>(null);

  // ── Filtres dans le panel (intégrés dans barre recherche) ──
  filterStatut     = signal('TOUS');
  searchText       = signal('');
  showFilterPanel  = signal(false);

  // ── Pagination ──
  page     = signal(1);
  pageSize = signal(20);

  filteredFeuilles = computed(() => {
    let list = this.feuilles();
    const q  = this.searchText().toLowerCase();
    if (this.filterStatut() && this.filterStatut() !== 'TOUS')
      list = list.filter(f => f.statut === this.filterStatut());
    if (q) list = list.filter(f =>
      (f.utilisateurNom || '').toLowerCase().includes(q) || f.semaineDu.includes(q));
    return list;
  });

  pagedFeuilles = computed(() => {
    const s = (this.page() - 1) * this.pageSize();
    return this.filteredFeuilles().slice(s, s + this.pageSize());
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredFeuilles().length / this.pageSize())));
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  hasFilters = computed(() => this.filterStatut() !== 'TOUS' || !!this.searchText());
  activeFiltersCount = computed(() => (this.filterStatut() !== 'TOUS' ? 1 : 0));

  readonly fmt = FeuilleTempsService.formatMinutes;

  countStatut(statut: string): number {
    return this.feuilles().filter(f => f.statut === statut).length;
  }

  statutLabel(s: string): string {
    return ({ BROUILLON:'Brouillon', SOUMISE:'Soumise', VALIDEE:'Validée', REJETEE:'Rejetée' } as any)[s] ?? s;
  }

  // Trouver l'utilisateur correspondant à une feuille
  getUtilisateur(ft: FeuilleTemps): Utilisateur | undefined {
    return this.utilisateurs().find(u =>
      u.id === ft.utilisateurId ||
      u.nomComplet === ft.utilisateurNom ||
      `${u.prenom} ${u.nom}` === ft.utilisateurNom
    );
  }

  getInitiales(nom?: string): string {
    if (!nom) return '?';
    const p = nom.trim().split(' ');
    return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : nom.substring(0,2).toUpperCase();
  }

  getAvatarColor(nom: string): string {
    const c = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6'];
    return c[(nom||'').charCodeAt(0) % c.length];
  }

  fmtDureeEntree(min: number): string {
    if (!min || min <= 0) return '—';
    const h = Math.floor(min/60); const m = min%60;
    return m > 0 ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`;
  }

  // ── Lifecycle ──
  ngOnInit(): void {
    // Vérifier permission
    if (!this.perms.canValidateTS()) {
      this.router.navigate(['/']);
      return;
    }
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) this.currentKcId.set(kcId);
    this.loadFeuilles();
    this.userSvc.getAllUsers().subscribe({ next: d => this.utilisateurs.set(d) });
  }

  loadFeuilles(): void {
    this.loading.set(true);
    this.ftSvc.getSoumises().subscribe({
      next: d => {
        this.feuilles.set(d.sort((a, b) => b.semaineDu.localeCompare(a.semaineDu)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  ouvrirDetail(ft: FeuilleTemps): void {
    this.feuilleDetail.set(ft);
    this.closeAllMenus();
  }
  fermerDetail(): void { this.feuilleDetail.set(null); }

  toggleMenu(id: number, e: Event): void {
    e.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }
  closeAllMenus(): void { this.openMenuId.set(null); this.showFilterPanel.set(false); }

  resetFilters(): void { this.filterStatut.set('TOUS'); this.searchText.set(''); this.page.set(1); }
  goToPage(p: number): void { if (p >= 1 && p <= this.totalPages()) this.page.set(p); }
  minVal(a: number, b: number): number { return Math.min(a, b); }

  valider(ft: FeuilleTemps): void {
    this.ui.confirm({
      title: 'Valider la feuille',
      message: `Valider la feuille de ${ft.utilisateurNom} du ${ft.semaineDu} ?`,
      confirmLabel: 'Valider', type: 'info',
      onConfirm: () => {
        this.ftSvc.valider(ft.id, this.currentKcId(), '').subscribe({
          next: updated => {
            this.feuilles.update(fts => fts.map(f => f.id === updated.id ? updated : f));
            if (this.feuilleDetail()?.id === ft.id) this.feuilleDetail.set(updated);
            this.closeAllMenus();
            this.ui.success('Feuille validée ✅');
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  ouvrirRejet(ft: FeuilleTemps): void {
    this.feuilleDetail.set(ft);
    this.motifRejet = '';
    this.closeAllMenus();
    this.showRejetModal.set(true);
  }

  confirmerRejet(): void {
    const ft = this.feuilleDetail();
    if (!ft) return;
    if (!this.motifRejet.trim()) { this.ui.warning('Le motif est obligatoire.'); return; }
    this.ftSvc.rejeter(ft.id, this.currentKcId(), this.motifRejet).subscribe({
      next: updated => {
        this.feuilles.update(fts => fts.map(f => f.id === updated.id ? updated : f));
        this.feuilleDetail.set(updated);
        this.showRejetModal.set(false);
        this.ui.success('Feuille rejetée.');
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }
}