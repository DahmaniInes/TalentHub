// src/app/features/feuille-temps/pages/mes-entrees/mes-entrees.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeuilleTempsService }  from '../../../../services/feuille-temps.service';
import { ProjetService }        from '../../../../services/projet.service';
import { ActiviteService }      from '../../../../services/activite.service';
import { UserService }          from '../../../../services/user.service';
import { KeycloakService }      from '../../../../services/keycloak.service';
import { UiService }            from '../../../../services/ui.service';
import { ErrorService }         from '../../../../services/error.service';
import { PermissionContextService } from '../../../../services/permission-context.service';
import {
  LigneFeuilleTemps,
  FeuilleTemps,
  LigneFeuilleTempsRequest
} from '../../../../shared/models/feuille-temps.model';
import { Projet }       from '../../../../shared/models/projet.model';
import { Activite }     from '../../../../shared/models/activite.model';
import { Utilisateur }  from '../../../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';

export interface EntreeFT {
  id?: number;
  feuilleId: number;
  feuilleStatut: string;
  date: string;
  projetId?: number;
  projetNom?: string;
  activiteId?: number;
  activiteNom?: string;
  heureDebut?: string;
  heureFin?: string;
  minutesTravaillees: number;
  minutesSupplementaires: number;
  commentaire?: string;
}

@Component({
  selector: 'app-mes-entrees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mes-entrees.component.html',
  styleUrls: ['./mes-entrees.component.css']
})
export class MesEntreesComponent implements OnInit {

  private ftSvc       = inject(FeuilleTempsService);
  private projetSvc   = inject(ProjetService);
  private activiteSvc = inject(ActiviteService);
  private userSvc     = inject(UserService);
  private keycloak    = inject(KeycloakService);
  readonly ui         = inject(UiService);
  private errorSvc    = inject(ErrorService);
  readonly perms      = inject(PermissionContextService);
  private readonly STATUT_TERMINE_ID = 4;

  currentUser = signal<Utilisateur | null>(null);
  feuilles    = signal<FeuilleTemps[]>([]);
  projets     = signal<Projet[]>([]);

  activitesParProjet = signal<Record<number, Activite[]>>({});
  activitesGlobales  = signal<Activite[]>([]);

  loading     = signal(false);
  saving      = signal(false);

  filterProjet   = signal('');
  filterActivite = signal('');
  filterStatut   = signal('');
  filterDateDu   = signal('');
  filterDateAu   = signal('');
  searchText     = signal('');
  showFilterPanel = signal(false);

  selectedIds = signal<Set<string>>(new Set());
  openMenuId = signal<string | null>(null);

  editingEntree = signal<EntreeFT | null>(null);
  addingEntree  = signal(false);
  editForm      = signal<Partial<EntreeFT>>({});

  readonly fmt      = FeuilleTempsService.formatMinutes;
  readonly fmtAMPM  = FeuilleTempsService.formatHeureAMPM;
  readonly fmtDuree = FeuilleTempsService.getDureeFmt;

  toutesEntrees = computed((): EntreeFT[] => {
    const entrees: EntreeFT[] = [];
    for (const ft of this.feuilles()) {
      for (const l of ft.lignes || []) {
        entrees.push({
          id: l.id,
          feuilleId: ft.id,
          feuilleStatut: ft.statut,
          date: l.date,
          projetId: l.projetId,
          projetNom: l.projetNom,
          activiteId: l.activiteId,
          activiteNom: l.activiteNom,
          heureDebut: l.heureDebut,
          heureFin: l.heureFin,
          minutesTravaillees: l.minutesTravaillees,
          minutesSupplementaires: l.minutesSupplementaires,
          commentaire: l.commentaire
        });
      }
    }
    return entrees.sort((a, b) => b.date.localeCompare(a.date));
  });

  filteredEntrees = computed((): EntreeFT[] => {
    let list = this.toutesEntrees();
    const q = this.searchText().toLowerCase();
    if (this.filterProjet())   list = list.filter(e => e.projetId === +this.filterProjet());
    if (this.filterActivite()) list = list.filter(e => e.activiteId === +this.filterActivite());
    if (this.filterStatut())   list = list.filter(e => e.feuilleStatut === this.filterStatut());
    if (this.filterDateDu())   list = list.filter(e => e.date >= this.filterDateDu());
    if (this.filterDateAu())   list = list.filter(e => e.date <= this.filterDateAu());
    if (q) list = list.filter(e =>
      (e.projetNom  || '').toLowerCase().includes(q) ||
      (e.activiteNom || '').toLowerCase().includes(q)
    );
    return list;
  });

  totalFiltre = computed(() =>
    this.filteredEntrees().reduce(
      (s, e) => s + e.minutesTravaillees + e.minutesSupplementaires, 0
    )
  );

  hasFilters = computed(() =>
    !!(this.filterProjet() || this.filterActivite() ||
       this.filterStatut() || this.filterDateDu() || this.filterDateAu() ||
       this.searchText())
  );

  activeFiltersCount = computed(() => {
    let n = 0;
    if (this.filterProjet())   n++;
    if (this.filterActivite()) n++;
    if (this.filterStatut())   n++;
    if (this.filterDateDu() || this.filterDateAu()) n++;
    return n;
  });

  allSelected = computed(() => {
    const ids = this.selectedIds();
    const list = this.filteredEntrees();
    return list.length > 0 && list.every(e => ids.has(this.getEntreeKey(e)));
  });

  someSelected = computed(() => {
    const ids = this.selectedIds();
    const list = this.filteredEntrees();
    return list.some(e => ids.has(this.getEntreeKey(e))) && !this.allSelected();
  });

  /**
   * Liste des activités proposées pour une NOUVELLE saisie — exclut
   * toujours les activités terminées.
   */
  get toutesActivitesVisibles(): Activite[] {
    const fromProjets = Object.values(this.activitesParProjet()).flat()
      .filter(a => a.statutActiviteId !== this.STATUT_TERMINE_ID);
    const ids = new Set(fromProjets.map(a => a.id));
    return [...fromProjets, ...this.activitesGlobales().filter(a => !ids.has(a.id) && a.statutActiviteId !== this.STATUT_TERMINE_ID)];
  }

  /**
   * ✅ NOUVEAU — Vrai si l'activité actuellement sélectionnée dans le
   * formulaire d'édition est terminée (et donc absente de
   * toutesActivitesVisibles). Utilisé pour verrouiller les champs de durée
   * tout en conservant le nom affiché.
   */
  editActiviteEstTerminee(): boolean {
    const id = this.editForm().activiteId;
    if (!id) return false;
    return !this.toutesActivitesVisibles.some(a => a.id === id);
  }

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => {
          this.currentUser.set(u);
          this.loadData(u.id);
          this.loadProjetsEtActivites(u.id);
        },
        error: () => this.loadData()
      });
    } else {
      this.loadData();
    }
  }

  private loadProjetsEtActivites(userId: number): void {
    this.projetSvc.getVisiblesPourFeuilleTemps(userId).subscribe({
      next: ps => {
        this.projets.set(ps);
        ps.forEach(p => this.loadActivitesDuProjet(p.id));
      },
      error: () => this.ui.error('Erreur lors du chargement des projets.')
    });
  }

  private loadActivitesDuProjet(projetId: number): void {
    if (!this.activitesParProjet()[projetId]) {
      this.activiteSvc.getByProjet(projetId).subscribe({
        next: d => this.activitesParProjet.update(m => ({ ...m, [projetId]: d }))
      });
    }
    this.activiteSvc.getGlobalesDisponiblesPourProjet(projetId).subscribe({
      next: d => this.activitesGlobales.update(g => {
        const ids = new Set(g.map(a => a.id));
        return [...g, ...d.filter(a => !ids.has(a.id))];
      })
    });
  }

  loadData(userId?: number): void {
    this.loading.set(true);
    const obs = userId ? this.ftSvc.getByUtilisateur(userId) : this.ftSvc.getAll();
    obs.subscribe({
      next: fts => { this.feuilles.set(fts); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  getEntreeKey(e: EntreeFT): string {
    return e.id ? `${e.id}` : `${e.feuilleId}-${e.date}-${e.activiteId ?? 0}`;
  }

  isSelected(key: string): boolean {
    return this.selectedIds().has(key);
  }

  toggleSelect(key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedIds.update(set => {
      const next = new Set(set);
      checked ? next.add(key) : next.delete(key);
      return next;
    });
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.clearSelection();
    } else {
      const keys = this.filteredEntrees().map(e => this.getEntreeKey(e));
      this.selectedIds.set(new Set(keys));
    }
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  supprimerSelection(): void {
    const keys = this.selectedIds();
    const entrees = this.filteredEntrees().filter(e => keys.has(this.getEntreeKey(e)));

    const parFeuille = new Map<number, EntreeFT[]>();
    for (const e of entrees) {
      if (!parFeuille.has(e.feuilleId)) parFeuille.set(e.feuilleId, []);
      parFeuille.get(e.feuilleId)!.push(e);
    }

    const feuillesATraiter = Array.from(parFeuille.entries());
    let remaining = feuillesATraiter.length;
    if (remaining === 0) return;

    this.saving.set(true);
    for (const [feuilleId, lignesASuppr] of feuillesATraiter) {
      const idsASuppr = new Set(lignesASuppr.map(e => e.id));
      this.ftSvc.getById(feuilleId).subscribe({
        next: ft => {
          const lignesReq: LigneFeuilleTempsRequest[] = ft.lignes
            .filter(l => !idsASuppr.has(l.id))
            .map(l => ({
              date:          l.date,
              projetId:      l.projetId,
              activiteId:    l.activiteId,
              clientId:      l.clientId,
              heureDebut:    l.heureDebut,
              heureFin:      l.heureFin,
              minutesTravaillees:     l.minutesTravaillees,
              minutesSupplementaires: l.minutesSupplementaires,
              commentaire:   l.commentaire
            }));

          this.ftSvc.update(feuilleId, {
            utilisateurId: ft.utilisateurId,
            semaineDu: ft.semaineDu,
            semaineAu: ft.semaineAu,
            statut: ft.statut,
            lignes: lignesReq
          }).subscribe({
            next: updated => {
              this.feuilles.update(fts => fts.map(f => f.id === updated.id ? updated : f));
              remaining--;
              if (remaining === 0) {
                this.clearSelection();
                this.saving.set(false);
                this.ui.success('Entrées supprimées.');
              }
            },
            error: (err: HttpErrorResponse) => {
              this.ui.error(this.errorSvc.parse(err).message);
              remaining--;
              if (remaining === 0) this.saving.set(false);
            }
          });
        },
        error: () => { remaining--; if (remaining === 0) this.saving.set(false); }
      });
    }
  }

  toggleMenu(e: EntreeFT, event: MouseEvent): void {
    event.stopPropagation();
    const key = this.getEntreeKey(e);
    this.openMenuId.set(this.openMenuId() === key ? null : key);
  }

  closeAllMenus(): void {
    this.openMenuId.set(null);
  }

  ouvrirAjout(): void {
    this.editingEntree.set(null);
    this.editForm.set({
      date: new Date().toISOString().split('T')[0],
      minutesTravaillees: 0,
      minutesSupplementaires: 0
    });
    this.addingEntree.set(true);
  }

  ouvrirEdition(entree: EntreeFT): void {
    if (!this.peutEditer(entree)) {
      this.ui.warning('Cette feuille est en lecture seule.');
      return;
    }
    this.addingEntree.set(false);
    this.editingEntree.set(entree);
    this.editForm.set({ ...entree });
    if (entree.projetId) this.loadActivitesDuProjet(entree.projetId);
  }

  fermerFormulaire(): void {
    this.editingEntree.set(null);
    this.addingEntree.set(false);
    this.editForm.set({});
  }

  onEditProjetChange(projetId: number): void {
    const projet = this.projets().find(p => p.id === +projetId);
    this.editForm.set({
      ...this.editForm(),
      projetId: projet?.id,
      projetNom: projet?.nom,
      activiteId: undefined,
      activiteNom: undefined
    });
    if (projet) this.loadActivitesDuProjet(projet.id);
  }

  onEditActiviteChange(activiteId: number): void {
    const act = this.toutesActivitesVisibles.find(a => a.id === +activiteId);
    this.editForm.set({ ...this.editForm(), activiteId: act?.id, activiteNom: act?.nom });
  }

  recalcDuree(): void {
    const f = this.editForm();
    if (f.heureDebut && f.heureFin) {
      const mins = FeuilleTempsService.minutesFromHHMM(f.heureDebut, f.heureFin);
      this.editForm.set({
        ...f,
        minutesTravaillees: Math.min(mins, 480),
        minutesSupplementaires: Math.max(0, mins - 480)
      });
    }
  }

  sauvegarderFormulaire(): void {
    if (this.addingEntree()) {
      this.ajouterEntree();
    } else {
      this.sauvegarderEdition();
    }
  }

  private ajouterEntree(): void {
    const form = this.editForm();
    if (!form.date) { this.ui.warning('La date est obligatoire.'); return; }

    const user = this.currentUser();
    if (!user) { this.ui.error('Utilisateur non identifié.'); return; }

    this.saving.set(true);

    const lundi = FeuilleTempsService.getLundiSemaine(new Date(form.date));
    const feuilleExistante = this.feuilles().find(f => f.semaineDu === lundi);

    const nouvelleLigne: LigneFeuilleTempsRequest = {
      date:          form.date,
      projetId:      form.projetId,
      activiteId:    form.activiteId,
      heureDebut:    form.heureDebut,
      heureFin:      form.heureFin,
      minutesTravaillees:     form.minutesTravaillees || 0,
      minutesSupplementaires: form.minutesSupplementaires || 0,
      commentaire:   form.commentaire
    };

    if (feuilleExistante) {
      const lignesReq: LigneFeuilleTempsRequest[] = [
        ...feuilleExistante.lignes.map(l => ({
          date:          l.date,
          projetId:      l.projetId,
          activiteId:    l.activiteId,
          clientId:      l.clientId,
          heureDebut:    l.heureDebut,
          heureFin:      l.heureFin,
          minutesTravaillees:     l.minutesTravaillees,
          minutesSupplementaires: l.minutesSupplementaires,
          commentaire:   l.commentaire
        })),
        nouvelleLigne
      ];
      this.ftSvc.update(feuilleExistante.id, {
        utilisateurId: feuilleExistante.utilisateurId,
        semaineDu: feuilleExistante.semaineDu,
        semaineAu: feuilleExistante.semaineAu,
        statut: feuilleExistante.statut,
        lignes: lignesReq
      }).subscribe({
        next: updated => {
          this.feuilles.update(fts => fts.map(f => f.id === updated.id ? updated : f));
          this.fermerFormulaire();
          this.ui.success('Entrée ajoutée.');
          this.saving.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.ui.error(this.errorSvc.parse(err).message);
          this.saving.set(false);
        }
      });
    } else {
      this.ftSvc.create({
        utilisateurId: user.id,
        semaineDu: lundi,
        semaineAu: FeuilleTempsService.getVendrediSemaine(lundi),
        statut: 'BROUILLON',
        lignes: [nouvelleLigne]
      }).subscribe({
        next: created => {
          this.feuilles.update(fts => [...fts, created]);
          this.fermerFormulaire();
          this.ui.success('Entrée ajoutée dans une nouvelle feuille.');
          this.saving.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.ui.error(this.errorSvc.parse(err).message);
          this.saving.set(false);
        }
      });
    }
  }

  private sauvegarderEdition(): void {
    const entree = this.editingEntree();
    const form   = this.editForm();
    if (!entree || !form) return;

    this.saving.set(true);

    this.ftSvc.getById(entree.feuilleId).subscribe({
      next: ft => {
        const lignesReq: LigneFeuilleTempsRequest[] = ft.lignes.map(l => {
          if (l.id === entree.id) {
            return {
              date:          form.date || l.date,
              projetId:      form.projetId,
              activiteId:    form.activiteId,
              clientId:      l.clientId,
              heureDebut:    form.heureDebut,
              heureFin:      form.heureFin,
              minutesTravaillees:     form.minutesTravaillees || 0,
              minutesSupplementaires: form.minutesSupplementaires || 0,
              commentaire:   form.commentaire
            };
          }
          return {
            date:          l.date,
            projetId:      l.projetId,
            activiteId:    l.activiteId,
            clientId:      l.clientId,
            heureDebut:    l.heureDebut,
            heureFin:      l.heureFin,
            minutesTravaillees:     l.minutesTravaillees,
            minutesSupplementaires: l.minutesSupplementaires,
            commentaire:   l.commentaire
          };
        });

        this.ftSvc.update(ft.id, {
          utilisateurId: ft.utilisateurId,
          semaineDu: ft.semaineDu,
          semaineAu: ft.semaineAu,
          statut: ft.statut,
          lignes: lignesReq
        }).subscribe({
          next: updated => {
            this.feuilles.update(fts => fts.map(f => f.id === updated.id ? updated : f));
            this.fermerFormulaire();
            this.ui.success('Entrée mise à jour.');
            this.saving.set(false);
          },
          error: (err: HttpErrorResponse) => {
            this.ui.error(this.errorSvc.parse(err).message);
            this.saving.set(false);
          }
        });
      },
      error: () => this.saving.set(false)
    });
  }

  copierEntree(entree: EntreeFT): void {
    if (!this.peutEditer(entree)) {
      this.ui.warning('Impossible de copier une entrée en lecture seule.');
      return;
    }
    this.addingEntree.set(false);
    this.editingEntree.set(null);
    this.editForm.set({
      ...entree,
      id: undefined,
      date: new Date().toISOString().split('T')[0]
    });
    this.addingEntree.set(true);
    if (entree.projetId) this.loadActivitesDuProjet(entree.projetId);
  }

  supprimerEntree(entree: EntreeFT): void {
    if (!this.peutEditer(entree)) {
      this.ui.warning('Impossible de supprimer une entrée en lecture seule.');
      return;
    }
    this.saving.set(true);
    this.ftSvc.getById(entree.feuilleId).subscribe({
      next: ft => {
        const lignesReq: LigneFeuilleTempsRequest[] = ft.lignes
        .filter(l => l.id !== entree.id)
        .map(l => ({
          date:          l.date,
          projetId:      l.projetId,
          activiteId:    l.activiteId,
          clientId:      l.clientId,
          heureDebut:    l.heureDebut,
          heureFin:      l.heureFin,
          minutesTravaillees:     l.minutesTravaillees,
          minutesSupplementaires: l.minutesSupplementaires,
          commentaire:   l.commentaire
        }));

        this.ftSvc.update(ft.id, {
          utilisateurId: ft.utilisateurId,
          semaineDu: ft.semaineDu,
          semaineAu: ft.semaineAu,
          statut: ft.statut,
          lignes: lignesReq
        }).subscribe({
          next: updated => {
            this.feuilles.update(fts => fts.map(f => f.id === updated.id ? updated : f));
            this.ui.success('Entrée supprimée.');
            this.saving.set(false);
          },
          error: (err: HttpErrorResponse) => {
            this.ui.error(this.errorSvc.parse(err).message);
            this.saving.set(false);
          }
        });
      },
      error: () => this.saving.set(false)
    });
  }

  resetFilters(): void {
    this.filterProjet.set('');
    this.filterActivite.set('');
    this.filterStatut.set('');
    this.filterDateDu.set('');
    this.filterDateAu.set('');
    this.searchText.set('');
  }

  exportCSV(): void {
    const entrees = this.filteredEntrees();
    const header = ['Date','Durée','Projet','Activité','Heures','Commentaire'];
    const rows = entrees.map(e => [
      e.date,
      this.fmtDuree(e.heureDebut || '', e.heureFin || ''),
      e.projetNom  || '—',
      e.activiteNom || '—',
      this.fmt(e.minutesTravaillees),
      e.commentaire || ''
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${c}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `entrees-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  peutEditer(e: EntreeFT): boolean {
    return e.feuilleStatut === 'BROUILLON' || e.feuilleStatut === 'REJETEE';
  }




  
}