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
  template: `
<div class="mx-page">
  <div class="mx-page-header">
    <div class="mx-page-title-block">
      <h1 class="mx-page-title">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" style="width:20px;height:20px"><path d="M4 4h12M4 8h12M4 12h8" stroke-linecap="round"/><circle cx="15" cy="15" r="3" stroke="currentColor"/></svg>
        Fiches de temps
      </h1>
      <p class="mx-page-subtitle">{{ filteredFeuilles().length }} fiche(s)</p>
    </div>
    <div class="mx-page-actions">
      <button class="mx-btn mx-btn-ghost" (click)="exportCSV()">
        <svg viewBox="0 0 14 14" fill="none" style="width:13px;height:13px"><path d="M7 2v8M4 7l3 3 3-3M2 11h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Exporter CSV
      </button>
    </div>
  </div>

  <!-- Filtres -->
  <div class="mx-toolbar" style="flex-wrap:wrap;gap:6px">
    <div class="mx-search">
      <svg viewBox="0 0 14 14" fill="none" class="mx-search-icon"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.3"/><path d="m10 10 3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      <input [value]="searchText()" (input)="searchText.set($any($event.target).value)" placeholder="Utilisateur, semaine..." class="mx-search-input">
    </div>
    <select class="mx-filter-select" [value]="filterStatut()" (change)="filterStatut.set($any($event.target).value)">
      <option value="">Tous les statuts</option>
      <option value="BROUILLON">Brouillon</option>
      <option value="SOUMISE">Soumise</option>
      <option value="VALIDEE">Validée</option>
      <option value="REJETEE">Rejetée</option>
    </select>
    <select class="mx-filter-select" [value]="filterUser()" (change)="filterUser.set($any($event.target).value)">
      <option value="">Tous les utilisateurs</option>
      <option *ngFor="let u of utilisateurs()" [value]="u.id">{{ u.prenom }} {{ u.nom }}</option>
    </select>
    <input type="date" class="mx-filter-select" [value]="filterDateDu()" (change)="filterDateDu.set($any($event.target).value)">
    <input type="date" class="mx-filter-select" [value]="filterDateAu()" (change)="filterDateAu.set($any($event.target).value)">
    <button *ngIf="filterStatut() || filterUser() || filterDateDu() || searchText()" class="mx-btn mx-btn-ghost mx-btn-sm"
            (click)="filterStatut.set(''); filterUser.set(''); filterDateDu.set(''); filterDateAu.set(''); searchText.set('')">
      Réinitialiser
    </button>
  </div>

  <!-- Résumé -->
  <div style="display:flex;gap:12px;padding:8px 0;flex-wrap:wrap">
    <div class="ft-stat-pill ft-stat-total">{{ feuilles().length }} total</div>
    <div class="ft-stat-pill ft-stat-soumise" (click)="filterStatut.set('SOUMISE')">{{ countByStatut('SOUMISE') }} soumises</div>
    <div class="ft-stat-pill ft-stat-validee" (click)="filterStatut.set('VALIDEE')">{{ countByStatut('VALIDEE') }} validées</div>
    <div class="ft-stat-pill ft-stat-rejetee" (click)="filterStatut.set('REJETEE')">{{ countByStatut('REJETEE') }} rejetées</div>
  </div>

  <div *ngIf="loading()" class="mx-loading"><div class="mx-spinner"></div> Chargement...</div>

  <!-- Tableau -->
  <div *ngIf="!loading()" class="mx-table-wrap">
    <div class="mx-table-scroll">
      <table class="mx-table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Semaine du</th>
            <th>Semaine au</th>
            <th>Heures</th>
            <th>Suppl.</th>
            <th>Lignes</th>
            <th>Statut</th>
            <th>Validé par</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let ft of pagedFeuilles()">
            <td>
              <div style="font-size:.78rem;font-weight:600;color:var(--text-primary)">{{ ft.utilisateurNom || 'Utilisateur #' + ft.utilisateurId }}</div>
            </td>
            <td style="font-size:.77rem;color:var(--text-secondary);white-space:nowrap">{{ ft.semaineDu | date:'dd/MM/yyyy' }}</td>
            <td style="font-size:.77rem;color:var(--text-secondary);white-space:nowrap">{{ ft.semaineAu | date:'dd/MM/yyyy' }}</td>
            <td style="font-size:.78rem;font-weight:600">{{ fmt(ft.minutesTravaillees) }}</td>
            <td style="font-size:.75rem;color:#10b981">{{ ft.minutesSupplementaires > 0 ? '+' + fmt(ft.minutesSupplementaires) : '—' }}</td>
            <td style="font-size:.75rem;color:var(--text-muted)">{{ ft.lignes?.length || 0 }}</td>
            <td>
              <span class="ft-statut-badge" [class]="'ft-statut-' + ft.statut.toLowerCase()">
                {{ {BROUILLON:'✏️ Brouillon', SOUMISE:'⏳ Soumise', VALIDEE:'✅ Validée', REJETEE:'❌ Rejetée'}[ft.statut] }}
              </span>
            </td>
            <td style="font-size:.72rem;color:var(--text-muted)">{{ ft.validePar ? ft.validePar.substring(0, 8) + '…' : '—' }}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button *ngIf="ft.statut === 'SOUMISE'" class="mx-btn mx-btn-primary mx-btn-sm" (click)="valider(ft)">Valider</button>
                <button *ngIf="ft.statut === 'SOUMISE'" class="mx-btn mx-btn-ghost mx-btn-sm" (click)="ouvrirRejet(ft)">Rejeter</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div *ngIf="filteredFeuilles().length === 0" class="mx-empty">
        <p class="mx-empty-title">Aucune fiche trouvée</p>
      </div>
    </div>

    <!-- Pagination simple -->
    <div *ngIf="filteredFeuilles().length > pageSize()" class="mx-pagination">
      <div class="mx-pagination-info">
        <strong>{{ (page()-1)*pageSize()+1 }}–{{ minVal(page()*pageSize(), filteredFeuilles().length) }}</strong>
        / <strong>{{ filteredFeuilles().length }}</strong>
      </div>
      <div class="mx-pagination-controls">
        <button class="mx-page-btn" [disabled]="page()===1" (click)="page.set(page()-1)">←</button>
        <button class="mx-page-btn" [disabled]="page()*pageSize() >= filteredFeuilles().length" (click)="page.set(page()+1)">→</button>
      </div>
    </div>
  </div>
</div>

<!-- Modal rejet -->
<div *ngIf="rejetModal()" class="mx-modal-backdrop" (click)="rejetModal.set(null)">
  <div class="mx-modal" style="max-width:420px;padding:0;overflow:hidden" (click)="$event.stopPropagation()">
    <div style="padding:14px 16px 10px;border-bottom:1px solid var(--border-color)">
      <span style="font-size:.88rem;font-weight:700">Rejeter la feuille</span>
    </div>
    <div style="padding:14px 16px">
      <label class="mx-field-label">Motif de rejet <span style="color:#ef4444">*</span></label>
      <textarea [(ngModel)]="motifRejet" rows="3" class="mx-field-textarea" placeholder="Expliquez la raison du rejet..."></textarea>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;padding:10px 16px;border-top:1px solid var(--border-color);background:var(--bg-hover)">
      <button class="mx-btn mx-btn-ghost" (click)="rejetModal.set(null)">Annuler</button>
      <button class="mx-btn mx-btn-danger" (click)="confirmerRejet()">Rejeter</button>
    </div>
  </div>
</div>
  `
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
  currentKcId  = signal<string>('');

  filterStatut  = signal('');
  filterUser    = signal('');
  filterDateDu  = signal('');
  filterDateAu  = signal('');
  searchText    = signal('');
  page          = signal(1);
  pageSize      = signal(20);

  rejetModal  = signal<FeuilleTemps | null>(null);
  motifRejet  = '';

  readonly fmt = FeuilleTempsService.formatMinutes;

  filteredFeuilles = computed(() => {
    let list = this.feuilles();
    const q  = this.searchText().toLowerCase();
    if (this.filterStatut()) list = list.filter(f => f.statut === this.filterStatut());
    if (this.filterUser())   list = list.filter(f => f.utilisateurId === +this.filterUser());
    if (this.filterDateDu()) list = list.filter(f => f.semaineDu >= this.filterDateDu());
    if (this.filterDateAu()) list = list.filter(f => f.semaineDu <= this.filterDateAu());
    if (q) list = list.filter(f => (f.utilisateurNom || '').toLowerCase().includes(q) || f.semaineDu.includes(q));
    return list;
  });

  pagedFeuilles = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredFeuilles().slice(start, start + this.pageSize());
  });

  countByStatut(s: string): number { return this.feuilles().filter(f => f.statut === s).length; }
  minVal(a: number, b: number): number { return Math.min(a, b); }

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) this.currentKcId.set(kcId);
    this.loading.set(true);
    this.ftSvc.getAll().subscribe({
      next: d => { this.feuilles.set(d.sort((a,b) => b.semaineDu.localeCompare(a.semaineDu))); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.userSvc.getAllUsers().subscribe({ next: d => this.utilisateurs.set(d) });
  }

  valider(ft: FeuilleTemps): void {
    this.ui.confirm({
      title: 'Valider la feuille', message: `Valider la feuille du ${ft.semaineDu} ?`,
      confirmLabel: 'Valider', type: 'info',
      onConfirm: () => {
        this.ftSvc.valider(ft.id, this.currentKcId(), '').subscribe({
          next: updated => {
            this.feuilles.update(fts => fts.map(f => f.id === updated.id ? updated : f));
            this.ui.success('Feuille validée ✅');
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  ouvrirRejet(ft: FeuilleTemps): void { this.motifRejet = ''; this.rejetModal.set(ft); }

  confirmerRejet(): void {
    const ft = this.rejetModal();
    if (!ft) return;
    if (!this.motifRejet.trim()) { this.ui.warning('Le motif est obligatoire.'); return; }
    this.ftSvc.rejeter(ft.id, this.currentKcId(), this.motifRejet).subscribe({
      next: updated => {
        this.feuilles.update(fts => fts.map(f => f.id === updated.id ? updated : f));
        this.rejetModal.set(null);
        this.ui.success('Feuille rejetée.');
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  exportCSV(): void {
    const header = ['Utilisateur', 'Semaine du', 'Semaine au', 'Heures', 'Suppl.', 'Lignes', 'Statut'];
    const rows = this.filteredFeuilles().map(f => [
      f.utilisateurNom || String(f.utilisateurId),
      f.semaineDu, f.semaineAu,
      this.fmt(f.minutesTravaillees),
      this.fmt(f.minutesSupplementaires),
      String(f.lignes?.length || 0),
      f.statut
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `fiches-temps-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}