// src/app/features/feuille-temps/pages/centre-donnees/centre-donnees.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeuilleTempsService } from '../../../../services/feuille-temps.service';
import { ProjetService }       from '../../../../services/projet.service';
import { ActiviteService }     from '../../../../services/activite.service';
import { UserService }         from '../../../../services/user.service';
import { UiService }           from '../../../../services/ui.service';
import { FeuilleTemps, LigneFeuilleTemps } from '../../../../shared/models/feuille-temps.model';
import { Projet }      from '../../../../shared/models/projet.model';
import { Activite }    from '../../../../shared/models/activite.model';
import { Utilisateur } from '../../../../shared/models/utilisateur.model';

interface LigneExport {
  utilisateur: string;
  semaine: string;
  date: string;
  projet: string;
  activite: string;
  client: string;
  duree: string;
  dureeMin: number;
  supp: string;
  statut: string;
  commentaire: string;
}

@Component({
  selector: 'app-centre-donnees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="cd-page">

  <!-- Header -->
  <div class="cd-header">
    <div>
      <h1 class="cd-title">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" style="width:20px;height:20px">
          <path d="M10 2L2.5 6v8L10 18l7.5-4V6L10 2z"/>
          <path d="M10 2v16M2.5 6l7.5 4 7.5-4" stroke-linecap="round"/>
        </svg>
        Centre de données
      </h1>
      <p class="cd-subtitle">Exportez vos fiches de temps selon vos critères</p>
    </div>
  </div>

  <!-- Formulaire filtres -->
  <div class="cd-form-card">
    <p class="cd-section-label">Critères d'exportation</p>

    <div class="cd-grid">
      <!-- Plage horaire -->
      <div class="cd-field">
        <label class="cd-label">Date de début</label>
        <input type="date" class="cd-input" [(ngModel)]="filtres.dateDu">
      </div>
      <div class="cd-field">
        <label class="cd-label">Date de fin</label>
        <input type="date" class="cd-input" [(ngModel)]="filtres.dateAu">
      </div>

      <!-- Utilisateur -->
      <div class="cd-field">
        <label class="cd-label">Employé</label>
        <select class="cd-input" [(ngModel)]="filtres.utilisateurId">
          <option value="">Tous les employés</option>
          <option *ngFor="let u of utilisateurs()" [value]="u.id">{{ u.prenom }} {{ u.nom }}</option>
        </select>
      </div>

      <!-- Statut -->
      <div class="cd-field">
        <label class="cd-label">Statut</label>
        <select class="cd-input" [(ngModel)]="filtres.statut">
          <option value="">Tous</option>
          <option value="BROUILLON">Brouillon</option>
          <option value="SOUMISE">Soumise</option>
          <option value="VALIDEE">Validée</option>
          <option value="REJETEE">Rejetée</option>
        </select>
      </div>

      <!-- Projet -->
      <div class="cd-field">
        <label class="cd-label">Projet</label>
        <select class="cd-input" [(ngModel)]="filtres.projetId" (change)="onProjetChange()">
          <option value="">Tous les projets</option>
          <option *ngFor="let p of projets()" [value]="p.id">{{ p.nom }}</option>
        </select>
      </div>

      <!-- Activité -->
      <div class="cd-field">
        <label class="cd-label">Activité</label>
        <select class="cd-input" [(ngModel)]="filtres.activiteId">
          <option value="">Toutes les activités</option>
          <option *ngFor="let a of activitesFiltrees()" [value]="a.id">{{ a.nom }}</option>
        </select>
      </div>
    </div>

    <!-- Boutons action -->
    <div class="cd-actions">
      <button class="cd-btn cd-btn-ghost" (click)="resetFiltres()">
        <svg viewBox="0 0 14 14" fill="none"><path d="M2 7a5 5 0 105-5H5m0 0L3 2m2 0L3 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Réinitialiser
      </button>
      <button class="cd-btn cd-btn-preview" [disabled]="loading()" (click)="chargerApercu()">
        <div *ngIf="loading()" class="cd-spin"></div>
        <svg *ngIf="!loading()" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="7" r="2.5" stroke="currentColor" stroke-width="1.3"/></svg>
        Aperçu ({{ lignesExport().length }})
      </button>
      <button class="cd-btn cd-btn-csv" [disabled]="lignesExport().length === 0" (click)="exporterCSV()">
        <svg viewBox="0 0 14 14" fill="none"><path d="M7 2v8M4 7l3 3 3-3M2 11h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Export CSV
      </button>
      <button class="cd-btn cd-btn-xls" [disabled]="lignesExport().length === 0" (click)="exporterXLS()">
        <svg viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4 4l6 6M10 4L4 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        Export XLS
      </button>
      <button class="cd-btn cd-btn-pdf" [disabled]="lignesExport().length === 0" (click)="exporterPDF()">
        <svg viewBox="0 0 14 14" fill="none"><path d="M3 1h6l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2"/><path d="M9 1v4h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        Export PDF
      </button>
    </div>
  </div>

  <!-- Aperçu résultats -->
  <div *ngIf="lignesExport().length > 0" class="cd-preview-card">
    <div class="cd-preview-header">
      <div class="cd-preview-title">
        Aperçu — {{ lignesExport().length }} entrées · {{ fmt(totalMinutes()) }} au total
      </div>
      <div class="cd-preview-stats">
        <span class="cd-stat-chip cd-stat-blue">{{ totalFeuilles() }} fiche(s)</span>
        <span class="cd-stat-chip cd-stat-green">{{ fmt(totalMinutes()) }} travaillés</span>
        <span *ngIf="totalSupp() > 0" class="cd-stat-chip cd-stat-orange">+{{ fmt(totalSupp()) }} suppl.</span>
      </div>
    </div>

    <div class="cd-table-scroll">
      <table class="cd-table">
        <thead>
          <tr>
            <th>Employé</th>
            <th>Semaine</th>
            <th>Date</th>
            <th>Projet</th>
            <th>Activité</th>
            <th>Client</th>
            <th>Durée</th>
            <th>Suppl.</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let l of pagedLignes()">
            <td class="cd-td-name">{{ l.utilisateur }}</td>
            <td class="cd-td-muted">{{ l.semaine }}</td>
            <td class="cd-td-muted" style="white-space:nowrap">{{ l.date }}</td>
            <td style="font-size:.76rem;font-weight:600">{{ l.projet || '—' }}</td>
            <td class="cd-td-muted">{{ l.activite || '—' }}</td>
            <td class="cd-td-muted">{{ l.client || '—' }}</td>
            <td style="font-size:.76rem;font-weight:700;color:var(--accent)">{{ l.duree }}</td>
            <td style="font-size:.73rem;color:#10b981">{{ l.supp !== '0:00' ? '+' + l.supp : '—' }}</td>
            <td>
              <span class="cd-statut" [class]="'cd-s-' + l.statut.toLowerCase()">{{ l.statut }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination simple -->
    <div *ngIf="lignesExport().length > pageSize" class="cd-pagination">
      <span class="cd-page-info">{{ (currentPage-1)*pageSize+1 }}–{{ min(currentPage*pageSize, lignesExport().length) }} / {{ lignesExport().length }}</span>
      <div style="display:flex;gap:4px">
        <button class="cd-page-btn" [disabled]="currentPage===1" (click)="currentPage=currentPage-1">←</button>
        <button class="cd-page-btn" [disabled]="currentPage*pageSize>=lignesExport().length" (click)="currentPage=currentPage+1">→</button>
      </div>
    </div>
  </div>

  <!-- Empty -->
  <div *ngIf="lignesExport().length === 0 && apercu()" class="cd-empty">
    <svg viewBox="0 0 48 48" fill="none" style="width:48px;height:48px;opacity:.3"><circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2"/><path d="M16 24h16M24 16v16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    <p>Aucune donnée pour ces critères</p>
  </div>

</div>
  `,
  styles: [`
.cd-page { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; min-height: 100%; }

/* Header */
.cd-header { display: flex; align-items: flex-start; justify-content: space-between; }
.cd-title { font-size: 1.2rem; font-weight: 800; color: var(--text-primary); margin: 0 0 4px; display: flex; align-items: center; gap: 9px; letter-spacing: -.3px; }
.cd-title svg { color: var(--accent); }
.cd-subtitle { font-size: .76rem; color: var(--text-muted); margin: 0; }

/* Formulaire */
.cd-form-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; padding: 18px 20px; }
.cd-section-label { font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--text-muted); margin: 0 0 14px; }
.cd-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
@media (max-width: 768px) { .cd-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 500px)  { .cd-grid { grid-template-columns: 1fr; } }

.cd-field { display: flex; flex-direction: column; gap: 4px; }
.cd-label { font-size: .65rem; font-weight: 600; color: var(--text-secondary); }
.cd-input { border: 1px solid var(--border-color); border-radius: 7px; padding: 7px 9px; font-size: .78rem; background: var(--bg-input); color: var(--text-primary); font-family: inherit; outline: none; transition: border-color .12s, box-shadow .12s; width: 100%; }
.cd-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }

/* Actions */
.cd-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.cd-btn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; border-radius: 8px; font-size: .76rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: inherit; white-space: nowrap; transition: all .14s; }
.cd-btn:disabled { opacity: .45; cursor: not-allowed; }
.cd-btn svg { width: 12px; height: 12px; flex-shrink: 0; }
.cd-btn-ghost   { background: var(--bg-hover); color: var(--text-secondary); border-color: var(--border-color); }
.cd-btn-ghost:hover:not(:disabled)   { background: var(--bg-hover); color: var(--text-primary); }
.cd-btn-preview { background: var(--accent-soft); color: var(--accent); border-color: rgba(192,38,211,.2); }
.cd-btn-preview:hover:not(:disabled) { background: var(--accent); color: white; }
.cd-btn-csv { background: rgba(16,185,129,.1); color: #10b981; border-color: rgba(16,185,129,.2); }
.cd-btn-csv:hover:not(:disabled) { background: #10b981; color: white; }
.cd-btn-xls { background: rgba(34,197,94,.1); color: #22c55e; border-color: rgba(34,197,94,.2); }
.cd-btn-xls:hover:not(:disabled) { background: #22c55e; color: white; }
.cd-btn-pdf { background: rgba(239,68,68,.1); color: #ef4444; border-color: rgba(239,68,68,.2); }
.cd-btn-pdf:hover:not(:disabled) { background: #ef4444; color: white; }

/* Preview */
.cd-preview-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; overflow: hidden; }
.cd-preview-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-color); flex-wrap: wrap; gap: 8px; }
.cd-preview-title { font-size: .82rem; font-weight: 700; color: var(--text-primary); }
.cd-preview-stats { display: flex; gap: 6px; flex-wrap: wrap; }
.cd-stat-chip { font-size: .68rem; font-weight: 600; padding: 2px 9px; border-radius: 20px; border: 1px solid; }
.cd-stat-blue   { background: rgba(59,130,246,.1);  color: #3b82f6; border-color: rgba(59,130,246,.2); }
.cd-stat-green  { background: rgba(16,185,129,.1);  color: #10b981; border-color: rgba(16,185,129,.2); }
.cd-stat-orange { background: rgba(249,115,22,.1);  color: #f97316; border-color: rgba(249,115,22,.2); }

/* Table */
.cd-table-scroll { overflow-x: auto; }
.cd-table { width: 100%; border-collapse: collapse; font-size: .76rem; }
.cd-table th { padding: 9px 12px; background: var(--bg-hover); font-size: .61rem; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); text-align: left; white-space: nowrap; }
.cd-table tbody tr { border-bottom: 1px solid var(--border-color); transition: background .1s; }
.cd-table tbody tr:last-child { border-bottom: none; }
.cd-table tbody tr:hover { background: var(--bg-hover); }
.cd-table td { padding: 9px 12px; vertical-align: middle; }
.cd-td-name { font-size: .76rem; font-weight: 600; color: var(--text-primary); }
.cd-td-muted { font-size: .72rem; color: var(--text-secondary); }

.cd-statut { font-size: .62rem; font-weight: 700; padding: 2px 7px; border-radius: 20px; border: 1px solid; }
.cd-s-brouillon { background: rgba(100,116,139,.1); color: #64748b; border-color: rgba(100,116,139,.2); }
.cd-s-soumise   { background: rgba(59,130,246,.1);  color: #3b82f6; border-color: rgba(59,130,246,.2); }
.cd-s-validee   { background: rgba(16,185,129,.1);  color: #10b981; border-color: rgba(16,185,129,.2); }
.cd-s-rejetee   { background: rgba(239,68,68,.1);   color: #ef4444; border-color: rgba(239,68,68,.2); }

/* Pagination */
.cd-pagination { display: flex; align-items: center; justify-content: space-between; padding: 9px 16px; border-top: 1px solid var(--border-color); background: var(--bg-hover); }
.cd-page-info { font-size: .71rem; color: var(--text-muted); }
.cd-page-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); font-size: .74rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .12s; }
.cd-page-btn:hover:not(:disabled) { background: var(--bg-hover); }
.cd-page-btn:disabled { opacity: .35; cursor: not-allowed; }

/* Empty */
.cd-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 60px; color: var(--text-muted); font-size: .8rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; }

.cd-spin { width: 12px; height: 12px; border: 2px solid rgba(192,38,211,.3); border-top-color: var(--accent); border-radius: 50%; animation: cdSpin .65s linear infinite; }
@keyframes cdSpin { to { transform: rotate(360deg); } }
  `]
})
export class CentreDonneesComponent implements OnInit {
  private ftSvc       = inject(FeuilleTempsService);
  private projetSvc   = inject(ProjetService);
  private activiteSvc = inject(ActiviteService);
  private userSvc     = inject(UserService);
  readonly ui         = inject(UiService);

  feuilles      = signal<FeuilleTemps[]>([]);
  projets       = signal<Projet[]>([]);
  activites     = signal<Activite[]>([]);
  utilisateurs  = signal<Utilisateur[]>([]);
  loading       = signal(false);
  apercu        = signal(false);
  lignesExport  = signal<LigneExport[]>([]);

  currentPage = 1;
  pageSize    = 25;

  filtres = {
    dateDu: '',
    dateAu: '',
    utilisateurId: '',
    statut: '',
    projetId: '',
    activiteId: ''
  };

  readonly fmt = FeuilleTempsService.formatMinutes;
  readonly min = Math.min;

  activitesFiltrees = signal<Activite[]>([]);

  totalMinutes = () => this.lignesExport().reduce((s, l) => s + l.dureeMin, 0);
  totalSupp    = () => this.lignesExport().reduce((s, l) => s + (parseInt(l.supp) || 0), 0);
  totalFeuilles = () => new Set(this.lignesExport().map(l => l.semaine + l.utilisateur)).size;

  pagedLignes() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.lignesExport().slice(start, start + this.pageSize);
  }

  ngOnInit(): void {
    this.projetSvc.getAll().subscribe({ next: d => this.projets.set(d) });
    this.userSvc.getAllUsers().subscribe({ next: d => this.utilisateurs.set(d) });
    this.ftSvc.getAll().subscribe({ next: d => this.feuilles.set(d) });
  }

  onProjetChange(): void {
    if (!this.filtres.projetId) { this.activitesFiltrees.set([]); return; }
    this.activiteSvc.getByProjet(+this.filtres.projetId).subscribe({ next: d => this.activitesFiltrees.set(d) });
    this.filtres.activiteId = '';
  }

  resetFiltres(): void {
    this.filtres = { dateDu:'', dateAu:'', utilisateurId:'', statut:'', projetId:'', activiteId:'' };
    this.lignesExport.set([]);
    this.apercu.set(false);
  }

  chargerApercu(): void {
    this.loading.set(true);
    this.currentPage = 1;
    const lignes: LigneExport[] = [];

    for (const ft of this.feuilles()) {
      // Filtre statut
      if (this.filtres.statut && ft.statut !== this.filtres.statut) continue;
      // Filtre utilisateur
      if (this.filtres.utilisateurId && ft.utilisateurId !== +this.filtres.utilisateurId) continue;
      // Filtre dates semaine
      if (this.filtres.dateDu && ft.semaineDu < this.filtres.dateDu) continue;
      if (this.filtres.dateAu && ft.semaineDu > this.filtres.dateAu) continue;

      for (const l of ft.lignes || []) {
        // Filtre projet
        if (this.filtres.projetId && l.projetId !== +this.filtres.projetId) continue;
        // Filtre activité
        if (this.filtres.activiteId && l.activiteId !== +this.filtres.activiteId) continue;

        lignes.push({
          utilisateur: ft.utilisateurNom || `User #${ft.utilisateurId}`,
          semaine: ft.semaineDu,
          date: l.date,
          projet: l.projetNom || '',
          activite: l.activiteNom || '',
          client: l.clientNom || '',
          duree: this.fmtMin(l.minutesTravaillees),
          dureeMin: l.minutesTravaillees,
          supp: this.fmtMin(l.minutesSupplementaires),
          statut: ft.statut,
          commentaire: l.commentaire || ''
        });
      }
    }

    lignes.sort((a, b) => a.date.localeCompare(b.date));
    this.lignesExport.set(lignes);
    this.apercu.set(true);
    this.loading.set(false);
    if (lignes.length === 0) this.ui.warning('Aucune donnée pour ces critères.');
  }

  private fmtMin(m: number): string {
    const h = Math.floor(m / 60);
    const mn = m % 60;
    return `${h}:${String(mn).padStart(2,'0')}`;
  }

  exporterCSV(): void {
    const header = ['Employé','Semaine','Date','Projet','Activité','Client','Durée','Suppl.','Statut','Commentaire'];
    const rows = this.lignesExport().map(l => [l.utilisateur, l.semaine, l.date, l.projet, l.activite, l.client, l.duree, l.supp, l.statut, l.commentaire]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    this.downloadFile(bom + csv, `export-temps-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8');
    this.ui.success('Export CSV téléchargé ✅');
  }

  exporterXLS(): void {
    // Export XLS simplifié (HTML table → .xls compatible Excel)
    const header = ['Employé','Semaine','Date','Projet','Activité','Client','Durée','Suppl.','Statut'];
    const rows = this.lignesExport().map(l => [l.utilisateur, l.semaine, l.date, l.projet, l.activite, l.client, l.duree, l.supp, l.statut]);
    let html = '<table border="1"><thead><tr>' + header.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
    html += rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('');
    html += '</tbody></table>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    this.downloadFile(html, `export-temps-${new Date().toISOString().split('T')[0]}.xls`, 'application/vnd.ms-excel');
    this.ui.success('Export XLS téléchargé ✅');
  }

  exporterPDF(): void {
    // Génère un PDF via la fenêtre d'impression du navigateur
    const header = ['Employé','Semaine','Date','Projet','Activité','Durée','Statut'];
    const rows = this.lignesExport().map(l => [l.utilisateur, l.semaine, l.date, l.projet, l.activite, l.duree, l.statut]);

    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Export Fiches de Temps</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #333; }
  h2 { font-size: 15px; margin-bottom: 4px; }
  p  { font-size: 10px; color: #666; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f0f0f0; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .4px; border: 1px solid #ddd; }
  td { padding: 5px 8px; border: 1px solid #eee; }
  tr:nth-child(even) td { background: #fafafa; }
  .total { margin-top: 12px; font-weight: bold; font-size: 11px; }
</style></head><body>
<h2>Rapport — Fiches de temps</h2>
<p>Généré le ${new Date().toLocaleDateString('fr-FR')} · ${this.lignesExport().length} entrées · ${this.fmtMin(this.totalMinutes())} total</p>
<table>
<thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
</table>
<p class="total">Total : ${this.fmtMin(this.totalMinutes())}</p>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
    this.ui.success('Impression PDF ouverte ✅');
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}