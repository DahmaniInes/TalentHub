// src/app/features/feuille-temps/feuille-temps.component.ts
// ✅ Barre horizontale SUPPRIMÉE — navigation via sidebar queryParams uniquement
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MaSemaineComponent }     from './pages/ma-semaine/ma-semaine.component';
import { MesEntreesComponent }    from './pages/mes-entrees/mes-entrees.component';
import { CalendrierFtComponent }  from './pages/calendrier/calendrier.component';
import { FichesDeTempsComponent } from './pages/fiches-de-temps/fiches-de-temps.component';
import { CentreDonneesComponent } from './pages/centre-donnees/centre-donnees.component';

export type PageFT = 'semaine' | 'entrees' | 'calendrier' | 'fiches' | 'centre';

@Component({
  selector: 'app-feuille-temps',
  standalone: true,
  imports: [
    CommonModule,
    MaSemaineComponent,
    MesEntreesComponent,
    CalendrierFtComponent,
    FichesDeTempsComponent,
    CentreDonneesComponent
  ],
  template: `
<div style="min-height:100%;background:var(--bg-primary)">
        <app-ma-semaine      *ngIf="page()==='semaine'"></app-ma-semaine>
      <app-mes-entrees     *ngIf="page()==='entrees'"></app-mes-entrees>
      <app-calendrier-ft   *ngIf="page()==='calendrier'"></app-calendrier-ft>
      <app-fiches-de-temps *ngIf="page()==='fiches'"></app-fiches-de-temps>
      <app-centre-donnees  *ngIf="page()==='centre'"></app-centre-donnees>
    </div>
  `,
styles: [':host{display:block;height:100%;overflow-y:auto}']
})
export class FeuilleTempsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  page = signal<PageFT>('semaine');

  ngOnInit(): void {
    this.route.queryParams.subscribe(p => {
      const val = p['page'] as PageFT;
      const valid: PageFT[] = ['semaine','entrees','calendrier','fiches','centre'];
      this.page.set(valid.includes(val) ? val : 'semaine');
    });
  }
}