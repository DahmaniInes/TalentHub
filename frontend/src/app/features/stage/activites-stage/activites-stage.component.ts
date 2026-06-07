import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjetStageService }       from '../../../services/projet-stage-service.service';
import { StagiaireService }         from '../../../services/stagiaire.service';
import { UserService }              from '../../../services/user.service';
import { KeycloakService }          from '../../../services/keycloak.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { UiService }                from '../../../services/ui.service';
import { ActiviteStage }            from '../../../shared/models/activite-stage.model';
import { ProjetStage }              from '../../../shared/models/projet-stage.model';
import { Utilisateur }              from '../../../shared/models/utilisateur.model';

@Component({
  selector: 'app-activites-stage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activites-stage.component.html'
})
export class ActivitesStageComponent implements OnInit {

  private svc      = inject(ProjetStageService);
  private stagSvc  = inject(StagiaireService);
  private userSvc  = inject(UserService);
  private keycloak = inject(KeycloakService);
  readonly perms   = inject(PermissionContextService);
  readonly ui      = inject(UiService);
  private router   = inject(Router);

  activites  = signal<ActiviteStage[]>([]);
  projets    = signal<ProjetStage[]>([]);
  stagiaires = signal<Utilisateur[]>([]);
  loading    = signal(false);
  saving     = signal(false);

  currentUserId    = signal<number | null>(null);
  currentUserProfil = signal<string>('');

  // Filtres
  search       = signal('');
  filterStatut = signal('');
  filterProjet = signal('');
  filterOpen   = signal(false);
  page         = signal(1);
  readonly pageSize = 15;

  // Slide-over
  slideOpen   = signal(false);
  editingId   = signal<number | null>(null);
  openMenuId  = signal<number | null>(null);

  form = signal<any>({
    titre: '', description: '', statut: 'A_FAIRE',
    avancement: 0, dateDebut: '', dateFin: '',
    commentaire: '', projetId: null, assigneId: null
  });

  // ── Computed ──
  filtered = computed(() => {
    let list = this.activites();
    const q = this.search().toLowerCase();
    if (q) list = list.filter(a =>
      a.titre.toLowerCase().includes(q) ||
      (a.projetTitre || '').toLowerCase().includes(q) ||
      (a.assigneNom  || '').toLowerCase().includes(q));
    if (this.filterStatut()) list = list.filter(a => a.statut === this.filterStatut());
    if (this.filterProjet()) list = list.filter(a => String(a.projetId) === this.filterProjet());
    return list;
  });

  paged = computed(() => {
    const s = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(s, s + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  hasFilters = computed(() => !!this.filterStatut() || !!this.filterProjet() || !!this.search());

  statsAFaire   = computed(() => this.activites().filter(a => a.statut === 'A_FAIRE').length);
  statsEnCours  = computed(() => this.activites().filter(a => a.statut === 'EN_COURS').length);
  statsTermines = computed(() => this.activites().filter(a => a.statut === 'TERMINE').length);

  canEdit = computed(() => this.perms.canViewAllInterns() || this.perms.canSupervise());
  canAdd  = computed(() => this.perms.canSupervise() || this.perms.can('INT_INTERN_SUBMIT') || this.perms.canViewAllInterns());

  // ── Init ──
  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => {
          this.currentUserId.set(u.id);
          this.currentUserProfil.set(u.profilNom || '');
          this.loadActivites(u);
        }
      });
    }
    this.stagSvc.getAll().subscribe({ next: d => this.stagiaires.set(d) });
    this.svc.getAll().subscribe({ next: d => this.projets.set(d) });
  }

  private loadActivites(u: Utilisateur): void {
    this.loading.set(true);
    this.svc.getAllActivites().subscribe({
      next: all => {
        const profil = (u.profilNom || '').toLowerCase();
        let list = all;
        // Stagiaire → voir seulement ses activités
        if (profil.includes('stagiaire')) {
          list = all.filter(a => a.assigneId === u.id || a.createurId === u.id);
        }
        this.activites.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // ── CRUD ──
  openCreate(): void {
    this.editingId.set(null);
    this.form.set({
      titre: '', description: '', statut: 'A_FAIRE',
      avancement: 0, dateDebut: '', dateFin: '',
      commentaire: '', projetId: null, assigneId: null
    });
    this.slideOpen.set(true);
  }

  openEdit(a: ActiviteStage, e: Event): void {
    e.stopPropagation();
    this.editingId.set(a.id);
    this.form.set({
      titre:       a.titre,
      description: a.description  || '',
      statut:      a.statut,
      avancement:  a.avancement,
      dateDebut:   a.dateDebut    || '',
      dateFin:     a.dateFin      || '',
      commentaire: a.commentaire  || '',
      projetId:    a.projetId     || null,
      assigneId:   a.assigneId    || null
    });
    this.openMenuId.set(null);
    this.slideOpen.set(true);
  }

  save(): void {
    if (!this.form().titre?.trim())   { this.ui.warning('Le titre est obligatoire.'); return; }
    if (!this.form().projetId)        { this.ui.warning('Sélectionnez un projet.');   return; }
    this.saving.set(true);
    const body = { ...this.form(), createurId: this.currentUserId() };
    const obs = this.editingId()
      ? this.svc.updateActivite(this.editingId()!, body)
      : this.svc.createActivite(body);
    obs.subscribe({
      next: saved => {
        this.activites.update(list =>
          this.editingId()
            ? list.map(a => a.id === saved.id ? saved : a)
            : [...list, saved]
        );
        this.slideOpen.set(false);
        this.saving.set(false);
        this.ui.success(this.editingId() ? 'Activité mise à jour ✅' : 'Activité créée ✅');
      },
      error: () => { this.saving.set(false); this.ui.error('Erreur lors de la sauvegarde.'); }
    });
  }

  delete(a: ActiviteStage, e: Event): void {
    e.stopPropagation();
    this.openMenuId.set(null);
    this.ui.confirm({
      title: 'Supprimer',
      message: `Supprimer "${a.titre}" ?`,
      confirmLabel: 'Supprimer',
      type: 'danger',
      onConfirm: () => this.svc.deleteActivite(a.id).subscribe({
        next: () => {
          this.activites.update(l => l.filter(x => x.id !== a.id));
          this.ui.success('Activité supprimée.');
        }
      })
    });
  }

  goToProjet(a: ActiviteStage, e: Event): void {
    e.stopPropagation();
    if (a.projetId) this.router.navigate(['/projets-stage', a.projetId]);
  }

  // ── UI helpers ──
  toggleMenu(id: number, e: Event): void {
    e.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  closeAllMenus(): void {
    this.openMenuId.set(null);
    this.filterOpen.set(false);
  }

  resetFilters(): void {
    this.search.set('');
    this.filterStatut.set('');
    this.filterProjet.set('');
    this.page.set(1);
  }

  goPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.page.set(p);
  }

  minVal(a: number, b: number): number { return Math.min(a, b); }

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
}