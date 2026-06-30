// src/app/features/features-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { AcceuilComponent } from './acceuil/acceuil.component';

import {DashboardComponent} from './dashboard/dashboard.component';
import {UserCreationComponent} from './admin/user-creation/user-creation.component';
import { FeuilleTempsComponent } from './feuille-temps/feuille-temps.component';   // ← Correction ici
import { ApprobationFeuilleTempsComponent } from './feuille-temps/approbation-feuille-temps/approbation-feuille-temps.component';
import { ProfilPermissionsComponent } from './admin/profil-permissions/profil-permissions.component';

import { ClientsComponent } from './admin/clients/clients.component';
import { ProjetsComponent  } from './projet/projets/projets.component';
import { UsersComponent }  from './admin/users/users.component';
import { GroupsComponent } from './admin/groups/groups.component';
 
import { ActivitesGlobalComponent } from './activite/activites-global-component/activites-global-component.component';

import {AdminDemandesComponent} from './demandes/admin-demandes/admin-demandes.component'
import {MesDemandesComponent} from './demandes/mes-demandes/mes-demandes.component'
import {TypesDemandesComponent} from './demandes/types-demandes/types-demandes.component'
import { ProfilComponent } from './profil/profil.component';
import { DebugTokenComponent } from './debug-token/debug-token.component';
import { ProjetDetailComponent } from './projet/projet-detail/projet-detail.component';
import { ActiviteDetailComponent } from './activite/activite-detail/activite-detail.component';

import { MesReclamationsComponent }    from './reclamation/mes-reclamations/mes-reclamations.component';
import { GererReclamationsComponent }   from './reclamation/gerer-reclamations/gerer-reclamations.component';
import { StatutReclamationComponent }   from './reclamation/statut-reclamation/statut-reclamation.component';
import { ServiceReclamationComponent }  from './reclamation/service-reclamation/service-reclamation.component';

import { StagiairesComponent }  from './stage/stagiaires/stagiaires.component';
import { TypeStageComponent }  from './stage/type-stage/type-stage.component';

import { ProjetsStageComponent }  from './stage/projets-stage/projets-stage.component';
import { ProjetStageDetailComponent }  from './stage/projet-stage-detail/projet-stage-detail.component';
import { ActivitesStageComponent }  from './stage/activites-stage/activites-stage.component';
import { MonProfilStagiaireComponent }  from './stage/mon-profil-stagiaire/mon-profil-stagiaire.component';

import { NomenclatureAcademiqueComponent }  from './stage/nomenclature-academique/nomenclature-academique.component';


import { StatutActiviteComponent } from './activite/statut-activite/statut-activite.component';
import { StatutProjetComponent } from './projet/statut-projet/statut-projet.component';
import { TypeProjetComponent } from './projet/type-projet/type-projet.component';
import { StatutStageComponent } from './stage/statut-stage/statut-stage.component';

import { PrioriteActiviteComponent } from './activite/priorite-activite/priorite-activite.component';
import { ReferentielActivitesComponent } from './activite/referentiel-activites/referentiel-activites.component';

import { ReferentielProjetsComponent } from './projet/referentiel-projets/referentiel-projets.component';
import { ReferentielStageComponent } from './stage/referentiel-stage/referentiel-stage.component';
import { ReferentielReclamationComponent } from './reclamation/referentiel-reclamation/referentiel-reclamation.component';
import { DocumentsStageComponent  } from './stage/document-espace-stage/document-espace-stage.component';




const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'acceuil', component: AcceuilComponent },
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
{ path: 'activites/:id', component: ActiviteDetailComponent },

{
  path: 'reclamations',
  component: MesReclamationsComponent      // RECLAMATION_VIEW_OWN / RECLAMATION_CREATE
},
{
  path: 'reclamations/gerer',
  component: GererReclamationsComponent    // RECLAMATION_VIEW_ALL / RECLAMATION_TREAT
},
{
  path: 'reclamations/statuts',
  component: StatutReclamationComponent    // RECLAMATION_STATUT_READ
},
{
  path: 'reclamations/services',
  component: ServiceReclamationComponent   // RECLAMATION_SERVICE_READ
},
{
  path: 'stagiaires',
  component: StagiairesComponent    // RECLAMATION_STATUT_READ
},
{
  path: 'types-stage',
  component: TypeStageComponent   // RECLAMATION_SERVICE_READ
},

{
  path: 'projets-stage',
  component: ProjetsStageComponent   // RECLAMATION_SERVICE_READ
},

{
  path: 'projets-stage/:id',
  component: ProjetStageDetailComponent   // RECLAMATION_SERVICE_READ
},

{
  path: 'activites-stage',
  component: ActivitesStageComponent   // RECLAMATION_SERVICE_READ
},

{
  path: 'mon-profil-stagiaire',
  component: MonProfilStagiaireComponent   // RECLAMATION_SERVICE_READ
},


{
  path: 'admin/nomenclature-academique',
  component: NomenclatureAcademiqueComponent   // RECLAMATION_SERVICE_READ
},


{
  path: 'statuts-activite',
  component: StatutActiviteComponent
},
{
  path: 'statuts-projet',
  component: StatutProjetComponent
},
{
  path: 'types-projet',
  component: TypeProjetComponent
},
{
  path: 'statuts-stage',
  component: StatutStageComponent
},

{
  path: 'activite-priorite',
  component: PrioriteActiviteComponent   
},


// Ajouter ces routes
{
  path: 'referentiel-activites',
  component : ReferentielActivitesComponent,
},
{
  path: 'referentiel-activites/:tab',
  component: ReferentielActivitesComponent
},
{
  path: 'referentiel-projets',
  redirectTo: 'referentiel-projets/statuts',
  pathMatch: 'full'
},
{
  path: 'referentiel-projets/:tab',
  component: ReferentielProjetsComponent
},
{
  path: 'referentiel-stage',
  redirectTo: 'referentiel-stage/types',
  pathMatch: 'full'
},
{
  path: 'referentiel-stage/:tab',
  component: ReferentielStageComponent
},
{
  path: 'referentiel-reclamation',
  redirectTo: 'referentiel-reclamation/services',
  pathMatch: 'full'
},
{
  path: 'referentiel-reclamation/:tab',
  component: ReferentielReclamationComponent
},
{ path: 'espace-stage/documents', component: DocumentsStageComponent }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FeaturesRoutingModule {}