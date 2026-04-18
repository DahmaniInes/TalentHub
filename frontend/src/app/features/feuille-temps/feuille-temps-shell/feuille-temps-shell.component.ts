// src/app/features/feuille-temps/feuille-temps-shell.component.ts
// ─── Composant shell avec navigation 4 onglets ───
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaSemaineComponent }      from '../pages/ma-semaine/ma-semaine.component';
import { MesEntreesComponent }     from '../pages/mes-entrees/mes-entrees.component';
import { CalendrierFtComponent }   from '../pages/calendrier/calendrier.component';
import { FichesDeTempsComponent }  from '../pages/fiches-de-temps/fiches-de-temps.component';

type PageFT = 'semaine' | 'entrees' | 'calendrier' | 'fiches';

@Component({
  selector: 'app-feuille-temps',
  standalone: true,
  imports: [
    CommonModule,
    MaSemaineComponent,
    MesEntreesComponent,
    CalendrierFtComponent,
    FichesDeTempsComponent
  ],
  template: `
<div style="display:flex;flex-direction:column;height:100%">
  <!-- Onglets navigation -->
  <nav class="ft-nav-tabs">
    <button class="ft-nav-tab" [class.active]="page()==='semaine'" (click)="page.set('semaine')">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:15px;height:15px"><rect x="1" y="2" width="14" height="13" rx="2"/><path d="M1 7h14M5 1v3M11 1v3" stroke-linecap="round"/></svg>
      Ma semaine
    </button>
    <button class="ft-nav-tab" [class.active]="page()==='entrees'" (click)="page.set('entrees')">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:15px;height:15px"><path d="M2 4h12M2 8h12M2 12h8" stroke-linecap="round"/></svg>
      Mes entrées
    </button>
    <button class="ft-nav-tab" [class.active]="page()==='calendrier'" (click)="page.set('calendrier')">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:15px;height:15px"><circle cx="8" cy="8" r="7"/><path d="M8 4v4l3 2" stroke-linecap="round"/></svg>
      Calendrier
    </button>
    <button class="ft-nav-tab" [class.active]="page()==='fiches'" (click)="page.set('fiches')">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" style="width:15px;height:15px"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M5 6h6M5 9h6M5 12h3" stroke-linecap="round"/></svg>
      Fiches de temps
    </button>
  </nav>

  <!-- Contenu -->
  <div style="flex:1;overflow:auto">
    <app-ma-semaine   *ngIf="page()==='semaine'"></app-ma-semaine>
    <app-mes-entrees  *ngIf="page()==='entrees'"></app-mes-entrees>
    <app-calendrier-ft *ngIf="page()==='calendrier'"></app-calendrier-ft>
    <app-fiches-de-temps *ngIf="page()==='fiches'"></app-fiches-de-temps>
  </div>
</div>
  `,
  styles: [`
.ft-nav-tabs {
  display: flex;
  gap: 2px;
  padding: 10px 20px 0;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
  flex-shrink: 0;
}
.ft-nav-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-family: inherit;
  font-size: .82rem;
  font-weight: 500;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all .14s;
  border-radius: 6px 6px 0 0;
}
.ft-nav-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
.ft-nav-tab.active { color: var(--accent); border-bottom-color: var(--accent); background: var(--bg-hover); }
  `]
})
export class FeuilleTempsShellComponent {
  page = signal<PageFT>('semaine');
}