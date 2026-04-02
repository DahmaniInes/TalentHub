// src/app/features/features-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {UserCreationComponent} from './admin/user-creation/user-creation.component';
import { CompleteProfileComponent } from './complete-profile/complete-profile.component';
import { FeuilleTempsComponent } from './feuille-temps/feuille-temps.component';   // ← Correction ici
import { DemandeComponent } from './demande/demande.component';   // ← Correction ici

const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'add-user', component: UserCreationComponent },
  { path: 'complete-profile', component: CompleteProfileComponent },
  { path: 'FeuilleTempsComponent', component: FeuilleTempsComponent } ,  // ← Nom correct
  { path: 'Demande', component: DemandeComponent }   // ← Nom correct

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeaturesRoutingModule {}