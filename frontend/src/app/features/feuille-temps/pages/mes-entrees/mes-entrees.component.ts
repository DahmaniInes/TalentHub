// src/app/features/feuille-temps/pages/mes-entrees/mes-entrees.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeuilleTempsService }  from '../../../../services/feuille-temps.service';
import { ProjetService }        from '../../../../services/projet.service';
import { ActiviteService }      from '../../../../services/activite.service';
import { ClientService }        from '../../../../services/client.service';
import { UserService }          from '../../../../services/user.service';
import { KeycloakService }      from '../../../../services/keycloak.service';
import { UiService }            from '../../../../services/ui.service';
import { ErrorService }         from '../../../../services/error.service';
import {
  LigneFeuilleTemps,
  FeuilleTemps,
  LigneFeuilleTempsRequest
} from '../../../../shared/models/feuille-temps.model';
import { Projet }       from '../../../../shared/models/projet.model';
import { Activite }     from '../../../../shared/models/activite.model';
import { Client }       from '../../../../shared/models/client.model';
import { Utilisateur }  from '../../../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';

// ─── Vue aplatie d'une entrée ────────────────────────────────────────────────
export interface EntreeFT {
  id?: number;
  feuilleId: number;
  feuilleStatut: string;
  date: string;
  projetId?: number;
  projetNom?: string;
  activiteId?: number;
  activiteNom?: string;
  clientId?: number;
  clientNom?: string;
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

  // ── Services ────────────────────────────────────────────────────────────────
  private ftSvc       = inject(FeuilleTempsService);
  private projetSvc   = inject(ProjetService);
  private activiteSvc = inject(ActiviteService);
  private clientSvc   = inject(ClientService);
  private userSvc     = inject(UserService);
  private keycloak    = inject(KeycloakService);
  readonly ui         = inject(UiService);
  private errorSvc    = inject(ErrorService);

  // ── Données ─────────────────────────────────────────────────────────────────
  currentUser = signal<Utilisateur | null>(null);
  feuilles    = signal<FeuilleTemps[]>([]);
  projets     = signal<Projet[]>([]);
  activites   = signal<Activite[]>([]);
  clients     = signal<Client[]>([]);
  loading     = signal(false);
  saving      = signal(false);

  // ── Filtres ─────────────────────────────────────────────────────────────────
  filterProjet   = signal('');
  filterActivite = signal('');
  filterClient   = signal('');
  filterStatut   = signal('');          // ← NOUVEAU
  filterDateDu   = signal('');
  filterDateAu   = signal('');
  searchText     = signal('');
  showFilterPanel = signal(false);      // ← NOUVEAU

  // ── Sélection bulk ──────────────────────────────────────────────────────────
  selectedIds = signal<Set<string>>(new Set()); // ← NOUVEAU

  // ── Menus contextuels ───────────────────────────────────────────────────────
  openMenuId = signal<string | null>(null);     // ← NOUVEAU

  // ── Edition / Ajout ─────────────────────────────────────────────────────────
  editingEntree = signal<EntreeFT | null>(null);
  addingEntree  = signal(false);                // ← NOUVEAU
  editForm      = signal<Partial<EntreeFT>>({});

  // ── Utilitaires statiques ───────────────────────────────────────────────────
  readonly fmt      = FeuilleTempsService.formatMinutes;
  readonly fmtAMPM  = FeuilleTempsService.formatHeureAMPM;
  readonly fmtDuree = FeuilleTempsService.getDureeFmt;

  // ── Computed : vue aplatie ───────────────────────────────────────────────────
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
          clientId: l.clientId,
          clientNom: l.clientNom,
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
    if (this.filterClient())   list = list.filter(e => e.clientId === +this.filterClient());
    if (this.filterStatut())   list = list.filter(e => e.feuilleStatut === this.filterStatut()); // ← NOUVEAU
    if (this.filterDateDu())   list = list.filter(e => e.date >= this.filterDateDu());
    if (this.filterDateAu())   list = list.filter(e => e.date <= this.filterDateAu());
    if (q) list = list.filter(e =>
      (e.projetNom  || '').toLowerCase().includes(q) ||
      (e.activiteNom || '').toLowerCase().includes(q) ||
      (e.clientNom  || '').toLowerCase().includes(q)
    );
    return list;
  });

  totalFiltre = computed(() =>
    this.filteredEntrees().reduce(
      (s, e) => s + e.minutesTravaillees + e.minutesSupplementaires, 0
    )
  );

  // ── Computed : filtres actifs ────────────────────────────────────────────────
  /** NOUVEAU — true si au moins un filtre est actif */
  hasFilters = computed(() =>
    !!(this.filterProjet() || this.filterActivite() || this.filterClient() ||
       this.filterStatut() || this.filterDateDu() || this.filterDateAu() ||
       this.searchText())
  );

  /** NOUVEAU — nombre de filtres actifs (hors searchText) */
  activeFiltersCount = computed(() => {
    let n = 0;
    if (this.filterProjet())   n++;
    if (this.filterActivite()) n++;
    if (this.filterClient())   n++;
    if (this.filterStatut())   n++;
    if (this.filterDateDu() || this.filterDateAu()) n++;
    return n;
  });

  // ── Computed : sélection ────────────────────────────────────────────────────
  /** NOUVEAU */
  allSelected = computed(() => {
    const ids = this.selectedIds();
    const list = this.filteredEntrees();
    return list.length > 0 && list.every(e => ids.has(this.getEntreeKey(e)));
  });

  /** NOUVEAU */
  someSelected = computed(() => {
    const ids = this.selectedIds();
    const list = this.filteredEntrees();
    return list.some(e => ids.has(this.getEntreeKey(e))) && !this.allSelected();
  });

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => { this.currentUser.set(u); this.loadData(u.id); },
        error: () => this.loadData()
      });
    } else {
      this.loadData();
    }
    this.projetSvc.getAll().subscribe({ next: d => this.projets.set(d) });
    this.clientSvc.getAll(true).subscribe({ next: d => this.clients.set(d) });
  }

  loadData(userId?: number): void {
    this.loading.set(true);
    const obs = userId ? this.ftSvc.getByUtilisateur(userId) : this.ftSvc.getAll();
    obs.subscribe({
      next: fts => { this.feuilles.set(fts); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // ── Clé unique par ligne ─────────────────────────────────────────────────────
  /** NOUVEAU — identifiant stable : id si dispo, sinon feuilleId+date+activiteId */
  getEntreeKey(e: EntreeFT): string {
    return e.id ? `${e.id}` : `${e.feuilleId}-${e.date}-${e.activiteId ?? 0}`;
  }

  // ── Sélection bulk ───────────────────────────────────────────────────────────
  /** NOUVEAU */
  isSelected(key: string): boolean {
    return this.selectedIds().has(key);
  }

  /** NOUVEAU */
  toggleSelect(key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedIds.update(set => {
      const next = new Set(set);
      checked ? next.add(key) : next.delete(key);
      return next;
    });
  }

  /** NOUVEAU */
  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.clearSelection();
    } else {
      const keys = this.filteredEntrees().map(e => this.getEntreeKey(e));
      this.selectedIds.set(new Set(keys));
    }
  }

  /** NOUVEAU */
  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  /** NOUVEAU — suppression en masse des entrées sélectionnées */
  supprimerSelection(): void {
    const keys = this.selectedIds();
    const entrees = this.filteredEntrees().filter(e => keys.has(this.getEntreeKey(e)));

    // Grouper par feuille
    const parFeuille = new Map<number, EntreeFT[]>();
    for (const e of entrees) {
      if (!parFeuille.has(e.feuilleId)) parFeuille.set(e.feuilleId, []);
      parFeuille.get(e.feuilleId)!.push(e);
    }

    // Pour chaque feuille concernée, retirer les lignes et sauvegarder
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
              date: l.date, projetId: l.projetId, projetNom: l.projetNom,
              activiteId: l.activiteId, activiteNom: l.activiteNom,
              clientId: l.clientId, clientNom: l.clientNom,
              heureDebut: l.heureDebut, heureFin: l.heureFin,
              minutesTravaillees: l.minutesTravaillees,
              minutesSupplementaires: l.minutesSupplementaires,
              commentaire: l.commentaire
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

  // ── Menus contextuels ────────────────────────────────────────────────────────
  /** NOUVEAU */
  toggleMenu(e: EntreeFT, event: MouseEvent): void {
    event.stopPropagation();
    const key = this.getEntreeKey(e);
    this.openMenuId.set(this.openMenuId() === key ? null : key);
  }

  /** NOUVEAU */
  closeAllMenus(): void {
    this.openMenuId.set(null);
  }

  // ── Formulaire ajout / édition ───────────────────────────────────────────────
  /** NOUVEAU — ouvre le slide-over en mode ajout */
  ouvrirAjout(): void {
    this.editingEntree.set(null);
    this.editForm.set({
      date: new Date().toISOString().split('T')[0],
      minutesTravaillees: 0,
      minutesSupplementaires: 0
    });
    this.addingEntree.set(true);
    // Charger toutes les activités par défaut
    this.activiteSvc.getAll().subscribe({ next: d => this.activites.set(d) });
  }

  /** Ouvre le slide-over en mode édition */
  ouvrirEdition(entree: EntreeFT): void {
    if (!this.peutEditer(entree)) {
      this.ui.warning('Cette feuille est en lecture seule.');
      return;
    }
    this.addingEntree.set(false);
    this.editingEntree.set(entree);
    this.editForm.set({ ...entree });
    if (entree.projetId) {
      this.activiteSvc.getByProjet(entree.projetId).subscribe({ next: d => this.activites.set(d) });
    } else {
      this.activiteSvc.getAll().subscribe({ next: d => this.activites.set(d) });
    }
  }

  /** NOUVEAU — ferme le slide-over (ajout ou édition) */
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
      clientId: (projet as any)?.clientId,
      clientNom: projet?.clientNom,
      activiteId: undefined,
      activiteNom: undefined
    });
    if (projet) {
      this.activiteSvc.getByProjet(projet.id).subscribe({ next: d => this.activites.set(d) });
    }
  }

  onEditActiviteChange(activiteId: number): void {
    const act = this.activites().find(a => a.id === +activiteId);
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

  /** NOUVEAU — dispatch ajout ou édition selon l'état actif */
  sauvegarderFormulaire(): void {
    if (this.addingEntree()) {
      this.ajouterEntree();
    } else {
      this.sauvegarderEdition();
    }
  }

  // ── Ajout d'une nouvelle entrée ──────────────────────────────────────────────
  /** NOUVEAU — crée ou réutilise la feuille de la semaine courante */
  private ajouterEntree(): void {
    const form = this.editForm();
    if (!form.date) { this.ui.warning('La date est obligatoire.'); return; }

    const user = this.currentUser();
    if (!user) { this.ui.error('Utilisateur non identifié.'); return; }

    this.saving.set(true);

    // Trouver la feuille correspondant à la semaine de la date saisie
    const lundi = FeuilleTempsService.getLundiSemaine(new Date(form.date));
    const feuilleExistante = this.feuilles().find(f => f.semaineDu === lundi);

    const nouvelleLigne: LigneFeuilleTempsRequest = {
      date: form.date,
      projetId: form.projetId,
      projetNom: form.projetNom,
      activiteId: form.activiteId,
      activiteNom: form.activiteNom,
      clientId: form.clientId,
      clientNom: form.clientNom,
      heureDebut: form.heureDebut,
      heureFin: form.heureFin,
      minutesTravaillees: form.minutesTravaillees || 0,
      minutesSupplementaires: form.minutesSupplementaires || 0,
      commentaire: form.commentaire
    };

    if (feuilleExistante) {
      // Ajouter la ligne à la feuille existante
      const lignesReq: LigneFeuilleTempsRequest[] = [
        ...feuilleExistante.lignes.map(l => ({
          date: l.date, projetId: l.projetId, projetNom: l.projetNom,
          activiteId: l.activiteId, activiteNom: l.activiteNom,
          clientId: l.clientId, clientNom: l.clientNom,
          heureDebut: l.heureDebut, heureFin: l.heureFin,
          minutesTravaillees: l.minutesTravaillees,
          minutesSupplementaires: l.minutesSupplementaires,
          commentaire: l.commentaire
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
      // Créer une nouvelle feuille pour la semaine
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

  // ── Modification d'une entrée existante ──────────────────────────────────────
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
              date: form.date || l.date,
              projetId: form.projetId, projetNom: form.projetNom,
              activiteId: form.activiteId, activiteNom: form.activiteNom,
              clientId: form.clientId, clientNom: form.clientNom,
              heureDebut: form.heureDebut, heureFin: form.heureFin,
              minutesTravaillees: form.minutesTravaillees || 0,
              minutesSupplementaires: form.minutesSupplementaires || 0,
              commentaire: form.commentaire
            };
          }
          return {
            date: l.date, projetId: l.projetId, projetNom: l.projetNom,
            activiteId: l.activiteId, activiteNom: l.activiteNom,
            clientId: l.clientId, clientNom: l.clientNom,
            heureDebut: l.heureDebut, heureFin: l.heureFin,
            minutesTravaillees: l.minutesTravaillees,
            minutesSupplementaires: l.minutesSupplementaires,
            commentaire: l.commentaire
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

  // ── Copie d'une entrée ───────────────────────────────────────────────────────
  /** NOUVEAU */
  copierEntree(entree: EntreeFT): void {
    if (!this.peutEditer(entree)) {
      this.ui.warning('Impossible de copier une entrée en lecture seule.');
      return;
    }
    this.addingEntree.set(false);
    this.editingEntree.set(null);
    this.editForm.set({
      ...entree,
      id: undefined,             // nouvelle ligne
      date: new Date().toISOString().split('T')[0] // date = aujourd'hui
    });
    this.addingEntree.set(true);
    if (entree.projetId) {
      this.activiteSvc.getByProjet(entree.projetId).subscribe({ next: d => this.activites.set(d) });
    }
  }

  // ── Suppression individuelle ─────────────────────────────────────────────────
  /** NOUVEAU */
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
            date: l.date, projetId: l.projetId, projetNom: l.projetNom,
            activiteId: l.activiteId, activiteNom: l.activiteNom,
            clientId: l.clientId, clientNom: l.clientNom,
            heureDebut: l.heureDebut, heureFin: l.heureFin,
            minutesTravaillees: l.minutesTravaillees,
            minutesSupplementaires: l.minutesSupplementaires,
            commentaire: l.commentaire
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

  // ── Réinitialisation des filtres ─────────────────────────────────────────────
  /** NOUVEAU */
  resetFilters(): void {
    this.filterProjet.set('');
    this.filterActivite.set('');
    this.filterClient.set('');
    this.filterStatut.set('');
    this.filterDateDu.set('');
    this.filterDateAu.set('');
    this.searchText.set('');
  }

  // ── Export CSV ───────────────────────────────────────────────────────────────
  exportCSV(): void {
    const entrees = this.filteredEntrees();
    const header = ['Date','Début','Fin','Durée','Client','Projet','Activité','Heures','Commentaire'];
    const rows = entrees.map(e => [
      e.date,
      e.heureDebut || '—',
      e.heureFin   || '—',
      this.fmtDuree(e.heureDebut || '', e.heureFin || ''),
      e.clientNom  || '—',
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

  // ── Guard ────────────────────────────────────────────────────────────────────
  peutEditer(e: EntreeFT): boolean {
    return e.feuilleStatut === 'BROUILLON' || e.feuilleStatut === 'REJETEE';
  }
}