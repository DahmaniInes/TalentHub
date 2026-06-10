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
import { ProjetService }            from '../../../services/projet.service';
import { StatutActiviteService }    from '../../../services/statutactivite.service';

import { Activite, ActiviteRequest } from '../../../shared/models/activite.model';
import { Projet }                    from '../../../shared/models/projet.model';
import { Utilisateur }               from '../../../shared/models/utilisateur.model';
import { StatutActivite }            from '../../../shared/models/statut-activite.model';

@Component({
  selector: 'app-activites-stage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activites-stage.component.html'
})
export class ActivitesStageComponent implements OnInit {

  private svc       = inject(ProjetStageService);
  private projetSvc = inject(ProjetService);
  private stagSvc   = inject(StagiaireService);
  private userSvc   = inject(UserService);
  private keycloak  = inject(KeycloakService);
  private nomencSvc = inject(StatutActiviteService);
  readonly perms    = inject(PermissionContextService);
  readonly ui       = inject(UiService);
  private router    = inject(Router);

  activites       = signal<Activite[]>([]);
  projets         = signal<Projet[]>([]);
  stagiaires      = signal<Utilisateur[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);
  loading         = signal(false);
  saving          = signal(false);

  currentUserId     = signal<number | null>(null);
  currentUserProfil = signal<string>('');

  // ✅ filterStatut garde le code String (A_FAIRE, EN_COURS, TERMINE)
  // utilisé dans le template via les badges cliquables du header
  filterStatut   = signal('');
  filterProjetId = signal<number | ''>('');
  // filterStatutId utilisé dans le panel filtre
  filterStatutId = signal<number | ''>('');
  filterOpen     = signal(false);
  search         = signal('');
  page           = signal(1);
  readonly pageSize = 15;

  slideOpen  = signal(false);
  editingId  = signal<number | null>(null);
  openMenuId = signal<number | null>(null);

  form = signal<ActiviteRequest & { assigneId?: number }>({
    nom: '', description: '', couleur: '#10b981',
    statutActiviteId: undefined, priorite: 2,
    estGlobale: false, visible: true, facturable: true
  });

  // ── Computed ──
  filtered = computed(() => {
    let list = this.activites();
    const q  = this.search().toLowerCase();
    if (q) list = list.filter(a =>
        a.nom.toLowerCase().includes(q) ||
        (a.projets?.[0]?.nom || '').toLowerCase().includes(q));

    // Filtre par code String (depuis les badges du header)
    if (this.filterStatut()) {
      list = list.filter(a => {
        const code = this.statutsActivite().find(s => s.id === a.statutActiviteId)?.code;
        return code === this.filterStatut();
      });
    }
    // Filtre par ID (depuis le panel filtre)
    if (this.filterStatutId())
      list = list.filter(a => a.statutActiviteId === +this.filterStatutId());

    if (this.filterProjetId())
      list = list.filter(a => a.projets?.some(p => p.id === +this.filterProjetId()));

    return list;
  });

  paged = computed(() => {
    const s = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(s, s + this.pageSize);
  });

  totalPages = computed(() =>
      Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  pagesArr   = computed(() =>
      Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  hasFilters = computed(() =>
      !!this.filterStatut() || !!this.filterStatutId() ||
      !!this.filterProjetId() || !!this.search());

  // ✅ Stats via codes depuis statutsActivite
  statsAFaire = computed(() => this.activites().filter(a => {
    const s = this.statutsActivite().find(st => st.id === a.statutActiviteId);
    return s?.code === 'A_FAIRE';
  }).length);

  statsEnCours = computed(() => this.activites().filter(a => {
    const s = this.statutsActivite().find(st => st.id === a.statutActiviteId);
    return s?.code === 'EN_COURS';
  }).length);

  statsTermines = computed(() => this.activites().filter(a => {
    const s = this.statutsActivite().find(st => st.id === a.statutActiviteId);
    return s?.code === 'TERMINE';
  }).length);

  canEdit = computed(() =>
      this.perms.canViewAllInterns() || this.perms.canSupervise());
  canAdd  = computed(() =>
      this.perms.canSupervise() ||
      this.perms.can('INT_INTERN_SUBMIT') ||
      this.perms.canViewAllInterns());

  // ── Init ──
  ngOnInit(): void {
    this.nomencSvc.getStatutsActivite().subscribe({
      next: d => {
        this.statutsActivite.set(d);
        const defaut = d[0]?.id;
        this.form.update(f => ({ ...f, statutActiviteId: defaut }));
      }
    });

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
    this.projetSvc.getProjetsStage().subscribe({ next: d => this.projets.set(d) });
  }

  private loadActivites(u: Utilisateur): void {
    this.loading.set(true);
    this.svc.getAllActivites().subscribe({
      next: all => {
        const profil = (u.profilNom || '').toLowerCase();
        let list = all;
        if (profil.includes('stagiaire'))
          list = list.filter(a => a.utilisateurId === u.id);
        this.activites.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // ── CRUD ──
  openCreate(): void {
    this.editingId.set(null);
    const defaut = this.statutsActivite()[0]?.id;
    this.form.set({
      nom: '', description: '', couleur: '#10b981',
      statutActiviteId: defaut, priorite: 2,
      estGlobale: false, visible: true, facturable: true,
      assigneId: undefined
    });
    this.slideOpen.set(true);
  }

  openEdit(a: Activite, e: Event): void {
    e.stopPropagation();
    this.editingId.set(a.id);
    this.form.set({
      nom:              a.nom,
      description:      a.description || '',
      couleur:          a.couleur || '#10b981',
      statutActiviteId: a.statutActiviteId,
      priorite:         a.priorite || 2,
      estGlobale:       a.estGlobale || false,
      visible:          a.visible,
      facturable:       a.facturable,
      heuresEstimees:   a.heuresEstimees,
      dateEcheance:     a.dateEcheance,
      utilisateurId:    a.utilisateurId
    });
    this.openMenuId.set(null);
    this.slideOpen.set(true);
  }

  save(): void {
    const f = this.form();
    if (!f.nom?.trim()) { this.ui.warning('Le nom est obligatoire.'); return; }
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
      utilisateurId:    (f as any).assigneId || this.currentUserId() || undefined
    };

    const editId = this.editingId();
    const obs = editId
        ? this.svc.updateActivite(editId, req)
        : this.svc.createActivite(req);

    obs.subscribe({
      next: saved => {
        this.activites.update(list =>
            editId
                ? list.map(a => a.id === saved.id ? saved : a)
                : [...list, saved]
        );
        this.slideOpen.set(false);
        this.saving.set(false);
        this.ui.success(editId ? 'Activité mise à jour ✅' : 'Activité créée ✅');
      },
      error: () => {
        this.saving.set(false);
        this.ui.error('Erreur lors de la sauvegarde.');
      }
    });
  }

  delete(a: Activite, e: Event): void {
    e.stopPropagation();
    this.openMenuId.set(null);
    this.ui.confirm({
      title: 'Supprimer',
      message: `Supprimer "${a.nom}" ?`,
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

  // ✅ Navigue vers le projet via projets[0].id
  goToProjet(a: Activite, e: Event): void {
    e.stopPropagation();
    const projetId = a.projets?.[0]?.id;
    if (projetId) this.router.navigate(['/projets-stage', projetId]);
  }

  // ── Helpers statut ──
  getStatutLibelle(id?: number): string {
    return this.statutsActivite().find(s => s.id === id)?.libelle || '—';
  }

  getStatutCode(id?: number): string {
    return this.statutsActivite().find(s => s.id === id)?.code || '';
  }

  getStatutBadgeClass(id?: number): string {
    const code = this.getStatutCode(id);
    const map: Record<string, string> = {
      'A_FAIRE':  'dt-badge dt-badge-default',
      'EN_COURS': 'dt-badge dt-badge-pending',
      'TERMINE':  'dt-badge dt-badge-delivered',
      'BLOQUE':   'dt-badge dt-badge-canceled'
    };
    return map[code] || 'dt-badge dt-badge-default';
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
    this.filterStatutId.set('');
    this.filterProjetId.set('');
    this.page.set(1);
  }

  goPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) this.page.set(p);
  }

  minVal(a: number, b: number): number { return Math.min(a, b); }

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
}