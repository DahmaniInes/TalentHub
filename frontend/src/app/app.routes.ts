// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/layout/layout.component';
import { TestComponent } from './test/test.component';
import { CompleteProfileComponent } from './features/complete-profile/complete-profile.component';

export const routes: Routes = [

   /* { path: 'test', component: TestComponent }*/
   { path: 'complete-profile', component: CompleteProfileComponent },

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