// src/app/features/features-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {UserCreationComponent} from './admin/user-creation/user-creation.component';
import { FeuilleTempsComponent } from './feuille-temps/feuille-temps.component';   // ← Correction ici
import { DemandeComponent } from './demande/demande.component';   // ← Correction ici
import { ApprobationFeuilleTempsComponent } from './approbation-feuille-temps/approbation-feuille-temps.component';

const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'add-user', component: UserCreationComponent },
  { path: 'FeuilleTempsComponent', component: FeuilleTempsComponent } ,  // ← Nom correct
  { path: 'Demande', component: DemandeComponent },   // ← Nom correct
  { path: 'approbations-ft', component: ApprobationFeuilleTempsComponent }


];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeaturesRoutingModule {}