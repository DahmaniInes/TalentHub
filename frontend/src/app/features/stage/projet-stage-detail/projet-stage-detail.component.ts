import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ProjetStageService }       from '../../../services/projet-stage-service.service';
import { StagiaireService }         from '../../../services/stagiaire.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { KeycloakService }          from '../../../services/keycloak.service';
import { UserService }              from '../../../services/user.service';
import { UiService }                from '../../../services/ui.service';
import { ProjetService }            from '../../../services/projet.service';
import { StatutActiviteService }    from '../../../services/statutactivite.service';

import { Projet, StatutProjet }            from '../../../shared/models/projet.model';
import { Activite, ActiviteRequest }       from '../../../shared/models/activite.model';
import { Utilisateur }                     from '../../../shared/models/utilisateur.model';
import { StatutActivite }                  from '../../../shared/models/statut-activite.model';

@Component({
  selector: 'app-projet-stage-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projet-stage-detail.component.html'
})
export class ProjetStageDetailComponent implements OnInit {

  private route     = inject(ActivatedRoute);
  private router    = inject(Router);
  private svc       = inject(ProjetStageService);
  private projetSvc = inject(ProjetService);
  private stagSvc   = inject(StagiaireService);
  private userSvc   = inject(UserService);
  private keycloak  = inject(KeycloakService);
  private nomencSvc = inject(StatutActiviteService);
  readonly perms    = inject(PermissionContextService);
  readonly ui       = inject(UiService);

  projet          = signal<Projet | null>(null);
  activites       = signal<Activite[]>([]);
  stagiaires      = signal<Utilisateur[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);
  statutsProjet   = signal<StatutProjet[]>([]);
  loading         = signal(false);
  saving          = signal(false);

  currentUser  = signal<Utilisateur | null>(null);
  slideOpen    = signal(false);
  editingActId = signal<number | null>(null);

  formAct = signal<ActiviteRequest & { commentaire?: string }>({
    nom: '', description: '', couleur: '#10b981',
    statutActiviteId: undefined, priorite: 2,
    estGlobale: false, visible: true, facturable: true
  });

  tab = signal<'activites' | 'infos'>('activites');

  // ✅ filtreStatutId (number) au lieu de filtreStatut (String)
  filtreStatutId = signal<number | ''>('');

  activitesFiltrees = computed(() => {
    let list = this.activites();
    if (this.filtreStatutId())
      list = list.filter(a => a.statutActiviteId === +this.filtreStatutId());
    return list;
  });

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);

    this.nomencSvc.getStatutsActivite().subscribe({
      next: d => {
        this.statutsActivite.set(d);
        const defaut = d[0]?.id;
        this.formAct.update(f => ({ ...f, statutActiviteId: defaut }));
      }
    });

    this.projetSvc.getStatutsProjet().subscribe({
      next: d => this.statutsProjet.set(d)
    });

    this.projetSvc.getById(id).subscribe({
      next: p => { this.projet.set(p); this.loading.set(false); }
    });

    this.svc.getActivitesByProjet(id).subscribe({
      next: d => this.activites.set(d)
    });

    this.stagSvc.getAll().subscribe({
      next: d => this.stagiaires.set(d)
    });

    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => this.currentUser.set(u)
      });
    }
  }

  openCreateAct(): void {
    this.editingActId.set(null);
    const defaut = this.statutsActivite()[0]?.id;
    this.formAct.set({
      nom: '', description: '', couleur: '#10b981',
      statutActiviteId: defaut, priorite: 2,
      estGlobale: false, visible: true, facturable: true
    });
    this.slideOpen.set(true);
  }

  openEditAct(a: Activite): void {
    this.editingActId.set(a.id);
    this.formAct.set({
      nom:              a.nom,
      description:      a.description || '',
      couleur:          a.couleur || '#10b981',
      statutActiviteId: a.statutActiviteId,
      priorite:         a.priorite || 2,
      estGlobale:       a.estGlobale || false,
      visible:          a.visible,
      facturable:       a.facturable,
      heuresEstimees:   a.heuresEstimees,
      dateEcheance:     a.dateEcheance
    });
    this.slideOpen.set(true);
  }

  saveAct(): void {
    const f = this.formAct();
    if (!f.nom?.trim()) { this.ui.warning('Nom obligatoire'); return; }
    this.saving.set(true);

    const req: ActiviteRequest = {
      nom:              f.nom,
      description:      f.description,
      couleur:          f.couleur,
      statutActiviteId: f.statutActiviteId,
      priorite:         f.priorite,
      estGlobale:       f.estGlobale,
      visible:          f.visible ?? true,
      facturable:       f.facturable ?? true,
      heuresEstimees:   f.heuresEstimees,
      dateEcheance:     f.dateEcheance,
      utilisateurId:    this.currentUser()?.id
    };

    const p      = this.projet();
    const editId = this.editingActId();

    if (editId) {
      this.svc.updateActivite(editId, req).subscribe({
        next: saved => {
          this.activites.update(l => l.map(a => a.id === saved.id ? saved : a));
          this.slideOpen.set(false);
          this.saving.set(false);
          this.ui.success('Activité mise à jour ✅');
        },
        error: () => { this.saving.set(false); this.ui.error('Erreur.'); }
      });
    } else {
      this.svc.createActivite(req).subscribe({
        next: newAct => {
          if (p) {
            const ids = this.activites().map(a => a.id);
            this.projetSvc.assignerActivites(p.id, [...ids, newAct.id])
                .subscribe({ next: updated => this.projet.set(updated) });
          }
          this.activites.update(l => [...l, newAct]);
          this.slideOpen.set(false);
          this.saving.set(false);
          this.ui.success('Activité créée ✅');
        },
        error: () => { this.saving.set(false); this.ui.error('Erreur.'); }
      });
    }
  }

  deleteAct(a: Activite): void {
    this.ui.confirm({
      title: 'Supprimer', message: `Supprimer "${a.nom}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this.svc.deleteActivite(a.id).subscribe({
        next: () => {
          this.activites.update(l => l.filter(x => x.id !== a.id));
          const p = this.projet();
          if (p) this.projetSvc.getById(p.id).subscribe({ next: up => this.projet.set(up) });
          this.ui.success('Supprimé.');
        }
      })
    });
  }

  // ✅ Avancement calculé depuis heuresPassees/heuresEstimees
  getAvancement(a: Activite): number {
    if (a.heuresEstimees && a.heuresEstimees > 0 && a.heuresPassees !== undefined) {
      return Math.min(100, Math.round((a.heuresPassees / a.heuresEstimees) * 100));
    }
    return 0;
  }

  updateAvancementAct(a: Activite, val: number): void {
    const code = val === 100 ? 'TERMINE' : val > 0 ? 'EN_COURS' : 'A_FAIRE';
    const statutId = this.statutsActivite().find(s => s.code === code)?.id;
    this.svc.updateActivite(a.id, {
      nom:              a.nom,
      heuresPassees:    val * (a.heuresEstimees || 100) / 100,
      statutActiviteId: statutId,
      visible:          a.visible,
      facturable:       a.facturable
    }).subscribe({
      next: updated => {
        this.activites.update(l => l.map(x => x.id === updated.id ? updated : x));
        const p = this.projet();
        if (p) this.projetSvc.getById(p.id).subscribe({ next: up => this.projet.set(up) });
      }
    });
  }

  // ✅ Helpers statut activité
  getStatutCode(id?: number): string {
    return this.statutsActivite().find(s => s.id === id)?.code || '';
  }

  getStatutLibelle(id?: number): string {
    return this.statutsActivite().find(s => s.id === id)?.libelle || '—';
  }

  // ✅ Helpers statut projet via nomenclature (remplace p.statut String)
  getStatutProjetColor(statutProjetId?: number): string {
    return this.statutsProjet().find(s => s.id === statutProjetId)?.couleur || '#94a3b8';
  }

  getStatutProjetLabel(statutProjetId?: number): string {
    return this.statutsProjet().find(s => s.id === statutProjetId)?.libelle || '—';
  }

  canEdit():       boolean { return this.perms.canViewAllInterns() || this.perms.canSupervise(); }
  canAddActivite(): boolean { return this.perms.canSupervise() || this.perms.can('INT_INTERN_SUBMIT'); }

  avancementColor(v: number): string {
    if (v >= 80) return '#10b981';
    if (v >= 40) return '#f59e0b';
    return '#6366f1';
  }

  fmtDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  goBack(): void { this.router.navigate(['/projets-stage']); }
}