// src/app/features/features-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {UserCreationComponent} from './admin/user-creation/user-creation.component';
import { FeuilleTempsComponent } from './feuille-temps/feuille-temps.component';   // ← Correction ici
import { ApprobationFeuilleTempsComponent } from './feuille-temps/approbation-feuille-temps/approbation-feuille-temps.component';
import { ProfilPermissionsComponent } from './admin/profil-permissions/profil-permissions.component';

import { ClientsComponent } from './admin/clients/clients.component';
import { ProjetsComponent  } from './admin/projets/projets.component';
import { UsersComponent }  from './users/users.component';
import { GroupsComponent } from './groups/groups.component';
 
import { ActivitesGlobalComponent } from './activites-global-component/activites-global-component.component';

import {AdminDemandesComponent} from './demandes/admin-demandes/admin-demandes.component'
import {MesDemandesComponent} from './demandes/mes-demandes/mes-demandes.component'
import {TypesDemandesComponent} from './demandes/types-demandes/types-demandes.component'
import { ProfilComponent } from './profil/profil.component';
import { DebugTokenComponent } from './debug-token/debug-token.component';
import { ProjetDetailComponent } from './admin/projet-detail/projet-detail.component';
import { ActiviteDetailComponent } from './admin/activite-detail/activite-detail.component';

const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'add-user', component: UserCreationComponent },
  { path: 'feuille-temps', component: FeuilleTempsComponent } ,  // ← Nom correct
  { path: 'approbations-ft', component: ApprobationFeuilleTempsComponent },
  { path: 'admin/profil-permissions',component: ProfilPermissionsComponent},
  { path: 'clients', component: ClientsComponent },
  { path: 'projets', component: ProjetsComponent  },
  { path: 'users',  component: UsersComponent  },
  { path: 'groups', component: GroupsComponent },
  { path: 'activites',component: ActivitesGlobalComponent},
{ path: 'profil', component: ProfilComponent },

  {
    path: 'Demande',
    component: MesDemandesComponent   // Vue employé : ses propres demandes
  },
  {
    path: 'admin/demandes',
    component: AdminDemandesComponent  // Vue RH/Admin : toutes les demandes + traitement
  },
  {
    path: 'admin/types-demandes',
    component: TypesDemandesComponent  // Référentiel types de demandes
  }, 
  {
    path: 'DebugToken',
    component: DebugTokenComponent  // Référentiel types de demandes
  },
  { path: 'projets/:id',   component: ProjetDetailComponent },
{ path: 'activites/:id', component: ActiviteDetailComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeaturesRoutingModule {}