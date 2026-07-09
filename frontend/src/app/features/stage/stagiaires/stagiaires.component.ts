import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';

import { StagiaireService }         from '../../../services/stagiaire.service';
import { ProjetStageService }       from '../../../services/projet-stage-service.service';
import { StageAngularService }      from '../../../services/stage.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { KeycloakService }          from '../../../services/keycloak.service';
import { UserService }              from '../../../services/user.service';
import { UiService }                from '../../../services/ui.service';
import { NomenclatureAcademiqueService } from '../../../services/nomenclature-academique-service.service';

import { Utilisateur, SuperviseurMin } from '../../../shared/models/utilisateur.model';
import { Projet } from '../../../shared/models/projet.model';
import { Universite, Specialite, NiveauEtude } from '../../../shared/models/nomenclature-academique.model';

@Component({
  selector: 'app-stagiaires',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stagiaires.component.html'
})
export class StagiairesComponent implements OnInit {

  private svc       = inject(StagiaireService);
  private projetSvc = inject(ProjetStageService);
  private stageSvc  = inject(StageAngularService);
  private userSvc   = inject(UserService);
  private keycloak  = inject(KeycloakService);
  private nomencSvc = inject(NomenclatureAcademiqueService);
  readonly perms    = inject(PermissionContextService);
  readonly ui       = inject(UiService);
  private router    = inject(Router);

  stagiaires     = signal<Utilisateur[]>([]);
  typesStage     = signal<any[]>([]);
  superviseurs   = signal<Utilisateur[]>([]);
  tousLesProjets = signal<Projet[]>([]);
  universites    = signal<Universite[]>([]);
  specialites    = signal<Specialite[]>([]);
  niveaux        = signal<NiveauEtude[]>([]);
  loading        = signal(false);
  saving         = signal(false);

  currentUserId = signal<number | null>(null);

  selectedIds  = signal<Set<number>>(new Set());

  search          = signal('');
  filterTypeStage = signal('');
  filterStatut    = signal('');
  filterOpen      = signal(false);
  page            = signal(1);
  readonly pageSize = 15;

  detailStagiaire = signal<Utilisateur | null>(null);
  tab             = signal<'infos' | 'stage' | 'superviseurs' | 'projets'>('infos');
  editForm        = signal<any>({});
  openMenuId      = signal<number | null>(null);

  projetPopupOpen = signal(false);
  projetPopupForm = signal<any>({ nom: '', description: '', dateDebut: '', dateFin: '' });
  projetAssignId  = signal<number | null>(null);

  // ── Computed ──
  filteredStagiaires = computed(() => {
    let list = this.stagiaires();
    const q = this.search().toLowerCase();
    if (q) list = list.filter(s =>
      (s.nomComplet || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q));
    if (this.filterTypeStage()) {
      list = list.filter(s =>
        String(s.stages?.[0]?.typeStageId) === this.filterTypeStage());
    }
    if (this.filterStatut() === 'actif')   list = list.filter(s => s.actif);
    if (this.filterStatut() === 'inactif') list = list.filter(s => !s.actif);
    return list;
  });

  pagedStagiaires = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredStagiaires().slice(start, start + this.pageSize);
  });

  totalPages  = computed(() => Math.max(1, Math.ceil(this.filteredStagiaires().length / this.pageSize)));
  pagesArr    = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  statsActifs = computed(() => this.stagiaires().filter(s => s.actif).length);
  hasFilters  = computed(() => !!this.filterTypeStage() || !!this.filterStatut() || !!this.search());

  allPageSelected  = computed(() =>
    this.pagedStagiaires().length > 0 &&
    this.pagedStagiaires().every(s => this.selectedIds().has(s.id)));
  somePageSelected = computed(() =>
    this.pagedStagiaires().some(s => this.selectedIds().has(s.id)) &&
    !this.allPageSelected());

  superviseursAssignes = computed((): SuperviseurMin[] => {
    return this.detailStagiaire()?.superviseurs || [];
  });

  superviseursDispo = computed(() => {
    const assignesIds = this.detailStagiaire()?.superviseurIds || [];
    return this.superviseurs().filter(u => !assignesIds.includes(u.id));
  });

  projetsDispoAAssigner = computed(() => {
    const s = this.detailStagiaire();
    if (!s) return this.tousLesProjets();
    const deja = s.projetsStage?.map(p => p.id) || [];
    return this.tousLesProjets().filter(p => !deja.includes(p.id));
  });

  ngOnInit(): void {
    if (!this.perms.canSeeGestionStagiaires()) return;
  
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => {
          this.currentUserId.set(u.id);
          this.loadStagiaires(u.id);
  
          // Projets de stage (typeProjetId = 4) — via /projets/superviseur/{id},
          // seule route accessible avec les permissions INT_SUPER_*/INT_ADMIN_*
          // de cette page (GET /projets sans filtre exige PROJECT_VIEW_ALL,
          // que ces profils n'ont pas → 403 systématique évité ici).
          if (this.perms.canAssignProject() || this.perms.canCreateProjetStage()) {
            this.projetSvc.getBySuperviseur(u.id).pipe(catchError(() => of([]))).subscribe({
              next: (d: Projet[]) => this.tousLesProjets.set(d.filter((p: Projet) => p.typeProjetId === 4))
            });
          }
        }
      });
    }
    this.svc.getTypesStage().subscribe({ next: d => this.typesStage.set(d) });
    this.svc.getSuperviseurs().subscribe({ next: d => this.superviseurs.set(d) });
    this.nomencSvc.getAllUniversites().subscribe({ next: d => this.universites.set(d) });
    this.nomencSvc.getAllSpecialites().subscribe({ next: d => this.specialites.set(d) });
    this.nomencSvc.getAllNiveaux().subscribe({ next: d => this.niveaux.set(d) });
  }
  private loadStagiaires(userId: number): void {
    this.loading.set(true);
    if (this.perms.canViewAllInterns()) {
      this.svc.getAll().subscribe({
        next: d => { this.stagiaires.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    } else if (this.perms.canViewMyInterns()) {
      this.svc.getMes(userId).subscribe({
        next: d => { this.stagiaires.set(d); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    } else {
      this.stagiaires.set([]);
      this.loading.set(false);
    }
  }

  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  toggleSelect(id: number): void {
    this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  toggleSelectAll(): void {
    if (this.allPageSelected()) {
      this.selectedIds.update(s => { const n = new Set(s); this.pagedStagiaires().forEach(x => n.delete(x.id)); return n; });
    } else {
      this.selectedIds.update(s => { const n = new Set(s); this.pagedStagiaires().forEach(x => n.add(x.id)); return n; });
    }
  }
  clearSelection(): void { this.selectedIds.set(new Set()); }

  goToAdd(): void { this.router.navigate(['/add-user'], { queryParams: { stagiaire: true } }); }

  openDetail(s: Utilisateur): void {
    this.detailStagiaire.set(s);
    this.tab.set('infos');
    // ✅ Utilise les IDs nomenclature — les sélects seront chargés depuis les listes
    this.editForm.set({
      prenom:        s.prenom,
      nom:           s.nom,
      telephone:     s.telephone,
      universiteId:  s.universiteId,
      specialiteId:  s.specialiteId,
      niveauEtudeId: s.niveauEtudeId,
      // Stage depuis le premier stage actif
      typeStageId:    s.stages?.[0]?.typeStageId,
      dateDebutStage: s.stages?.[0]?.dateDebut,
      dateFinStage:   s.stages?.[0]?.dateFin,
      dateSoutenance: s.stages?.[0]?.dateSoutenance,
      // ✅ NOUVEAU — on garde l'ID du premier stage pour pouvoir le PUT/PATCH
      // au lieu d'un POST qui en créerait un nouveau à chaque sauvegarde.
      stageId: s.stages?.[0]?.id ?? null
    });
  }

  fermerDetail(): void { this.detailStagiaire.set(null); this.projetPopupOpen.set(false); }

  /**
   * ✅ CORRIGÉ — Sauvegarde désormais aussi les champs du stage (Type de
   * stage, dates début/fin/soutenance) :
   * - S'il existe déjà un stage pour ce stagiaire (stageId connu), on le
   *   met à jour via PUT /stages/{id}.
   * - Sinon, on en crée un nouveau via POST /stages/utilisateur/{userId}.
   * AVANT : seul updateStagiaire() (infos académiques) était appelé — les
   * champs du stage n'étaient donc jamais envoyés au backend, restant
   * toujours null en base malgré la saisie dans le formulaire.
   */
  sauvegarder(): void {
    const s = this.detailStagiaire();
    if (!s) return;
    this.saving.set(true);

    const bodyUtilisateur = {
      prenom:        this.editForm().prenom,
      nom:           this.editForm().nom,
      telephone:     this.editForm().telephone,
      universiteId:  this.editForm().universiteId  || null,
      specialiteId:  this.editForm().specialiteId  || null,
      niveauEtudeId: this.editForm().niveauEtudeId || null
    };

    const bodyStage = {
      typeStageId:    this.editForm().typeStageId    || null,
      dateDebut:      this.editForm().dateDebutStage || null,
      dateFin:        this.editForm().dateFinStage   || null,
      dateSoutenance: this.editForm().dateSoutenance || null
    };

    const stageId: number | null = this.editForm().stageId;

    // ✅ Lance les deux sauvegardes (infos utilisateur + stage). On attend
    // les deux avant de considérer l'opération terminée pour rafraîchir
    // l'affichage avec des données cohérentes.
    this.svc.update(s.id, bodyUtilisateur).subscribe({
      next: updatedUser => {
        // Utilise le service de stage dédié (StageAngularService), injecté
        // ci-dessus comme `stageSvc` — voir l'ajout d'injection.
        const obsStage = stageId
            ? this.stageSvc.updateStage(stageId, bodyStage)
            : this.stageSvc.createStage(s.id, bodyStage);

        obsStage.subscribe({
          next: savedStage => {
            // ✅ Fusionne le stage sauvegardé dans l'objet utilisateur local
            // pour que l'affichage (colonne Type stage / Période) soit à
            // jour sans recharger toute la liste depuis le serveur.
            const stagesActuels = updatedUser.stages?.length ? [...updatedUser.stages] : [];
            if (stageId) {
              const idx = stagesActuels.findIndex(st => st.id === stageId);
              if (idx >= 0) stagesActuels[idx] = savedStage as any;
              else stagesActuels.unshift(savedStage as any);
            } else {
              stagesActuels.unshift(savedStage as any);
            }
            const updatedComplet: Utilisateur = { ...updatedUser, stages: stagesActuels };

            this.stagiaires.update(list => list.map(u => u.id === updatedComplet.id ? updatedComplet : u));
            this.detailStagiaire.set(updatedComplet);
            // ✅ Mémorise l'ID du stage nouvellement créé pour les sauvegardes suivantes
            this.editForm.update(f => ({ ...f, stageId: (savedStage as any).id }));
            this.saving.set(false);
            this.ui.success('Stagiaire mis à jour ✅');
          },
          error: () => {
            this.saving.set(false);
            this.ui.error('Infos enregistrées, mais erreur lors de la sauvegarde du stage.');
          }
        });
      },
      error: () => { this.saving.set(false); this.ui.error('Erreur lors de la sauvegarde.'); }
    });
  }

  supprimerStagiaire(s: Utilisateur, e: Event): void {
    e.stopPropagation();
    this.ui.confirm({
      title: 'Supprimer', message: `Supprimer "${s.nomComplet}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this.ui.warning('La suppression désactive le compte via la page Utilisateurs.')
    });
  }

  /**
   * ✅ CORRIGÉ — Ajoute un superviseur en passant par assignerSuperviseurs()
   * avec la liste COMPLÈTE recalculée à partir de s.superviseurs (la vraie
   * collection d'objets, pas s.superviseurIds qui peut être désynchronisé).
   * C'est exactement la même logique que le bouton "Superviseurs" du drawer
   * projet (projet-stage-detail.component), qui fonctionne correctement.
   */
  ajouterSuperviseur(supId: number): void {
    const s = this.detailStagiaire();
    if (!s || !supId) return;
    const idsActuels = (s.superviseurs || []).map(sup => sup.id);
    const idsCibles = idsActuels.includes(supId) ? idsActuels : [...idsActuels, supId];
    this.svc.assignerSuperviseurs(s.id, idsCibles).subscribe({
      next: updated => {
        this.detailStagiaire.set(updated);
        this.stagiaires.update(l => l.map(u => u.id === updated.id ? updated : u));
        this.ui.success('Superviseur ajouté ✅');
      },
      error: () => this.ui.error('Erreur lors de l\'ajout du superviseur.')
    });
  }

  /**
   * ✅ CORRIGÉ — Retire un superviseur déjà assigné.
   * AVANT : appelait this.svc.retirerSuperviseur(s.id, supId), qui mappe
   * vers DELETE /stagiaires/{id}/superviseurs/{superviseurId} côté backend.
   * Ce endpoint renvoyait l'entité Utilisateur relue dans le MÊME contexte
   * de transaction Hibernate — la collection superviseurLinks pouvait donc
   * encore refléter l'état EN CACHE (avant désactivation), même si le lien
   * avait bien été désactivé en base. Résultat : le superviseur retiré
   * continuait d'apparaître dans la réponse, donnant l'impression que le
   * retrait échouait, alors que la base était correcte.
   *
   * CORRIGÉ : on utilise désormais assignerSuperviseurs() avec la liste
   * COMPLÈTE des superviseurs restants (tous moins celui qu'on retire) —
   * exactement la même route et la même logique que le bouton "Superviseurs"
   * du drawer projet (projet-stage-detail.component), qui fonctionne déjà
   * correctement et ne souffre pas de ce problème de cache.
   */
  retirerSuperviseur(supId: number): void {
    const s = this.detailStagiaire();
    if (!s) return;
    const idsRestants = (s.superviseurs || [])
        .map(sup => sup.id)
        .filter(id => id !== supId);
    this.svc.assignerSuperviseurs(s.id, idsRestants).subscribe({
      next: updated => {
        this.detailStagiaire.set(updated);
        this.stagiaires.update(l => l.map(u => u.id === updated.id ? updated : u));
        this.ui.success('Superviseur retiré ✅');
      },
      error: () => this.ui.error('Erreur lors du retrait du superviseur.')
    });
  }

  estVous(userId: number): boolean { return this.currentUserId() === userId; }

  ouvrirPopupProjet(): void {
    this.projetPopupForm.set({ nom: '', description: '', dateDebut: '', dateFin: '' });
    this.projetAssignId.set(null);
    this.projetPopupOpen.set(true);
  }

  creerProjet(): void {
    const s = this.detailStagiaire();
    if (!s || !this.projetPopupForm().nom?.trim()) { this.ui.warning('Le nom est obligatoire.'); return; }
    const body = {
      nom: this.projetPopupForm().nom,
      description: this.projetPopupForm().description,
      dateDebut:   this.projetPopupForm().dateDebut || undefined,
      dateFin:     this.projetPopupForm().dateFin   || undefined,
      typeProjetId: 3,
      visible: true, facturable: true, autoriserActivitesGlobales: false
    };
    this.projetSvc.create(body).subscribe({
      next: saved => {
        this.projetSvc.assignerAStagiaire(saved.id, s.id).subscribe();
        this.projetPopupOpen.set(false);
        this.ui.success('Projet créé ✅');
      }
    });
  }

  assignerProjetExistant(): void {
    const s = this.detailStagiaire();
    const projetId = this.projetAssignId();
    if (!s || !projetId) { this.ui.warning('Sélectionnez un projet.'); return; }
    this.projetSvc.assignerAStagiaire(projetId, s.id).subscribe({
      next: () => { this.projetPopupOpen.set(false); this.ui.success('Projet assigné ✅'); }
    });
  }

  // ── Helpers nomenclature ──
  getUniversiteLibelle(id?: number): string {
    if (!id) return '—';
    return this.universites().find(u => u.id === id)?.libelle ?? '—';
  }

  getSpecialiteLibelle(id?: number): string {
    if (!id) return '—';
    return this.specialites().find(s => s.id === id)?.libelle ?? '—';
  }

  getNiveauLibelle(id?: number): string {
    if (!id) return '—';
    return this.niveaux().find(n => n.id === id)?.libelle ?? '—';
  }

  getTypeStageLibelle(id?: number): string {
    if (!id) return '—';
    return this.typesStage().find(t => t.id === id)?.libelle ?? '—';
  }

  // ✅ Helpers pour accéder au premier stage
  getPremierTypeStage(s: Utilisateur): number | undefined {
    return s.stages?.[0]?.typeStageId;
  }

  getPremierDateDebut(s: Utilisateur): string | undefined {
    return s.stages?.[0]?.dateDebut;
  }

  getPremierDateFin(s: Utilisateur): string | undefined {
    return s.stages?.[0]?.dateFin;
  }

  // ✅ Premier projet via projetsStage
  getPremierProjet(s: Utilisateur): { nom: string } | null {
    if (!s.projetsStage || s.projetsStage.length === 0) return null;
    return { nom: s.projetsStage[0].nomComplet || `Projet #${s.projetsStage[0].id}` };
  }

  /** ✅ NOUVEAU — Tooltip listant tous les superviseurs au-delà des 4 premiers affichés */
  getRestSuperviseursTooltip(supers: SuperviseurMin[]): string {
    return supers.map(s => s.nomComplet).join(', ');
  }

  resetFilters(): void { this.search.set(''); this.filterTypeStage.set(''); this.filterStatut.set(''); this.page.set(1); }
  goPage(p: number): void { if (p >= 1 && p <= this.totalPages()) this.page.set(p); }
  minVal(a: number, b: number): number { return Math.min(a, b); }
  closeMenu(): void { this.openMenuId.set(null); }

  getInitiales(nom?: string): string {
    if (!nom) return '?';
    const p = nom.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : nom.substring(0, 2).toUpperCase();
  }

  getAvatarColor(nom: string): string {
    const c = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6'];
    return c[(nom || '').charCodeAt(0) % c.length];
  }

  fmtDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}