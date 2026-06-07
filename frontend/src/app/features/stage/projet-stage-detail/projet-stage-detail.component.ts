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
import { ProjetStage }              from '../../../shared/models/projet-stage.model';
import { ActiviteStage }            from '../../../shared/models/activite-stage.model';
import { Utilisateur }              from '../../../shared/models/utilisateur.model';

@Component({
  selector: 'app-projet-stage-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projet-stage-detail.component.html'
})
export class ProjetStageDetailComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private svc      = inject(ProjetStageService);
  private stagSvc  = inject(StagiaireService);
  private userSvc  = inject(UserService);
  private keycloak = inject(KeycloakService);
  readonly perms   = inject(PermissionContextService);
  readonly ui      = inject(UiService);

  projet     = signal<ProjetStage | null>(null);
  activites  = signal<ActiviteStage[]>([]);
  stagiaires = signal<Utilisateur[]>([]);
  loading    = signal(false);
  saving     = signal(false);

  currentUser = signal<Utilisateur | null>(null);
  slideOpen   = signal(false);
  editingActId = signal<number | null>(null);

  formAct = signal<any>({
    titre: '', description: '', statut: 'A_FAIRE',
    avancement: 0, dateDebut: '', dateFin: '', commentaire: '', assigneId: null
  });

  tab = signal<'activites' | 'infos'>('activites');

  filtreStatut = signal('');

  activitesFiltrees = computed(() => {
    let list = this.activites();
    if (this.filtreStatut()) list = list.filter(a => a.statut === this.filtreStatut());
    return list;
  });

  avancementMoyen = computed(() => {
    const list = this.activites();
    if (!list.length) return 0;
    return Math.round(list.reduce((s, a) => s + a.avancement, 0) / list.length);
  });

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);
    this.svc.getById(id).subscribe({
      next: p => {
        this.projet.set(p);
        this.loading.set(false);
      }
    });
    this.svc.getActivitesByProjet(id).subscribe({ next: d => this.activites.set(d) });
    this.stagSvc.getAll().subscribe({ next: d => this.stagiaires.set(d) });
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) this.userSvc.getUserByKeycloakId(kcId).subscribe({ next: u => this.currentUser.set(u) });
  }

  openCreateAct(): void {
    this.editingActId.set(null);
    this.formAct.set({ titre: '', description: '', statut: 'A_FAIRE', avancement: 0, dateDebut: '', dateFin: '', commentaire: '', assigneId: null });
    this.slideOpen.set(true);
  }

  openEditAct(a: ActiviteStage): void {
    this.editingActId.set(a.id);
    this.formAct.set({
      titre: a.titre, description: a.description || '',
      statut: a.statut, avancement: a.avancement,
      dateDebut: a.dateDebut || '', dateFin: a.dateFin || '',
      commentaire: a.commentaire || '', assigneId: a.assigneId || null
    });
    this.slideOpen.set(true);
  }

  saveAct(): void {
    if (!this.formAct().titre?.trim()) { this.ui.warning('Titre obligatoire'); return; }
    this.saving.set(true);
    const body = { ...this.formAct(), projetId: this.projet()?.id, createurId: this.currentUser()?.id };
    const obs = this.editingActId()
      ? this.svc.updateActivite(this.editingActId()!, body)
      : this.svc.createActivite(body);
    obs.subscribe({
      next: saved => {
        this.activites.update(list =>
          this.editingActId()
            ? list.map(a => a.id === saved.id ? saved : a)
            : [...list, saved]
        );
        // Rafraîchir avancement projet
        this.svc.getById(this.projet()!.id).subscribe({ next: p => this.projet.set(p) });
        this.slideOpen.set(false);
        this.saving.set(false);
        this.ui.success(this.editingActId() ? 'Activité mise à jour ✅' : 'Activité créée ✅');
      },
      error: () => { this.saving.set(false); this.ui.error('Erreur.'); }
    });
  }

  deleteAct(a: ActiviteStage): void {
    this.ui.confirm({
      title: 'Supprimer', message: `Supprimer "${a.titre}" ?`, confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this.svc.deleteActivite(a.id).subscribe({
        next: () => {
          this.activites.update(l => l.filter(x => x.id !== a.id));
          this.svc.getById(this.projet()!.id).subscribe({ next: p => this.projet.set(p) });
          this.ui.success('Supprimé.');
        }
      })
    });
  }

  updateAvancementAct(a: ActiviteStage, val: number): void {
    this.svc.updateActivite(a.id, { avancement: val, statut: val === 100 ? 'TERMINE' : (val > 0 ? 'EN_COURS' : 'A_FAIRE') }).subscribe({
      next: updated => {
        this.activites.update(l => l.map(x => x.id === updated.id ? updated : x));
        this.svc.getById(this.projet()!.id).subscribe({ next: p => this.projet.set(p) });
      }
    });
  }

  canEdit(): boolean { return this.perms.canViewAllInterns() || this.perms.canSupervise(); }
  canAddActivite(): boolean { return this.perms.canSupervise() || this.perms.can('INT_INTERN_SUBMIT'); }

  statutLabel(s: string): string {
    return ({ A_FAIRE: 'À faire', EN_COURS: 'En cours', TERMINE: 'Terminé' } as any)[s] ?? s;
  }

  avancementColor(v: number): string {
    if (v >= 80) return '#10b981';
    if (v >= 40) return '#f59e0b';
    return '#6366f1';
  }

  fmtDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  goBack(): void { this.router.navigate(['/projets-stage']); }
}