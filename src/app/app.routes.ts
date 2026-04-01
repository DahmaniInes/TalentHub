// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: '',
        loadChildren: () =>
          import('./features/features.module').then(m => m.FeaturesModule)
      }
    ]
  }
];