// src/app/features/feuille-temps/pages/mes-entrees/mes-entrees.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeuilleTempsService } from '../../../../services/feuille-temps.service';
import { ProjetService }       from '../../../../services/projet.service';
import { ActiviteService }     from '../../../../services/activite.service';
import { ClientService }       from '../../../../services/client.service';
import { UserService }         from '../../../../services/user.service';
import { KeycloakService }     from '../../../../services/keycloak.service';
import { UiService }           from '../../../../services/ui.service';
import { ErrorService }        from '../../../../services/error.service';
import { LigneFeuilleTemps, FeuilleTemps, LigneFeuilleTempsRequest } from '../../../../shared/models/feuille-temps.model';
import { Projet } from '../../../../shared/models/projet.model';
import { Activite } from '../../../../shared/models/activite.model';
import { Client } from '../../../../shared/models/client.model';
import { Utilisateur } from '../../../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';

// Vue aplatie d'une entrée
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
  private ftSvc       = inject(FeuilleTempsService);
  private projetSvc   = inject(ProjetService);
  private activiteSvc = inject(ActiviteService);
  private clientSvc   = inject(ClientService);
  private userSvc     = inject(UserService);
  private keycloak    = inject(KeycloakService);
  readonly ui         = inject(UiService);
  private errorSvc    = inject(ErrorService);

  currentUser = signal<Utilisateur | null>(null);
  feuilles    = signal<FeuilleTemps[]>([]);
  projets     = signal<Projet[]>([]);
  activites   = signal<Activite[]>([]);
  clients     = signal<Client[]>([]);
  loading     = signal(false);
  saving      = signal(false);

  // Filtres
  filterProjet   = signal('');
  filterActivite = signal('');
  filterClient   = signal('');
  filterDateDu   = signal('');
  filterDateAu   = signal('');
  searchText     = signal('');

  // Edition inline
  editingEntree = signal<EntreeFT | null>(null);
  editForm = signal<Partial<EntreeFT>>({});

  readonly fmt     = FeuilleTempsService.formatMinutes;
  readonly fmtAMPM = FeuilleTempsService.formatHeureAMPM;
  readonly fmtDuree = FeuilleTempsService.getDureeFmt;

  // Vue aplatie de toutes les entrées
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
    if (this.filterDateDu())   list = list.filter(e => e.date >= this.filterDateDu());
    if (this.filterDateAu())   list = list.filter(e => e.date <= this.filterDateAu());
    if (q) list = list.filter(e =>
      (e.projetNom || '').toLowerCase().includes(q) ||
      (e.activiteNom || '').toLowerCase().includes(q) ||
      (e.clientNom || '').toLowerCase().includes(q));
    return list;
  });

  totalFiltre = computed(() =>
    this.filteredEntrees().reduce((s, e) => s + e.minutesTravaillees + e.minutesSupplementaires, 0)
  );

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => { this.currentUser.set(u); this.loadData(u.id); },
        error: () => this.loadData()
      });
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

  // ── Edition inline ──
  ouvrirEdition(entree: EntreeFT): void {
    if (entree.feuilleStatut === 'VALIDEE' || entree.feuilleStatut === 'SOUMISE') {
      this.ui.warning('Cette feuille est en lecture seule.');
      return;
    }
    this.editingEntree.set(entree);
    this.editForm.set({ ...entree });
    // Charger les activités du projet si disponible
    if (entree.projetId) {
      this.activiteSvc.getByProjet(entree.projetId).subscribe({ next: d => this.activites.set(d) });
    }
  }

  onEditProjetChange(projetId: number): void {
    const projet = this.projets().find(p => p.id === +projetId);
    this.editForm.set({ ...this.editForm(), projetId: projet?.id, projetNom: projet?.nom, clientId: (projet as any)?.clientId, clientNom: projet?.clientNom });
    if (projet) this.activiteSvc.getByProjet(projet.id).subscribe({ next: d => this.activites.set(d) });
  }

  onEditActiviteChange(activiteId: number): void {
    const act = this.activites().find(a => a.id === +activiteId);
    this.editForm.set({ ...this.editForm(), activiteId: act?.id, activiteNom: act?.nom });
  }

  recalcDuree(): void {
    const f = this.editForm();
    if (f.heureDebut && f.heureFin) {
      const mins = FeuilleTempsService.minutesFromHHMM(f.heureDebut, f.heureFin);
      this.editForm.set({ ...f, minutesTravaillees: Math.min(mins, 480), minutesSupplementaires: Math.max(0, mins - 480) });
    }
  }

  sauvegarderEdition(): void {
    const entree = this.editingEntree();
    const form   = this.editForm();
    if (!entree || !form) return;

    this.saving.set(true);

    // Recharger la feuille, modifier la ligne, PUT
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

        this.ftSvc.update(ft.id, { utilisateurId: ft.utilisateurId, semaineDu: ft.semaineDu, semaineAu: ft.semaineAu, statut: ft.statut, lignes: lignesReq }).subscribe({
          next: updated => {
            this.feuilles.update(fts => fts.map(f => f.id === updated.id ? updated : f));
            this.editingEntree.set(null);
            this.ui.success('Entrée mise à jour.');
            this.saving.set(false);
          },
          error: (err: HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.saving.set(false); }
        });
      },
      error: () => this.saving.set(false)
    });
  }

  // ── Export CSV ──
  exportCSV(): void {
    const entrees = this.filteredEntrees();
    const header = ['Date', 'Début', 'Fin', 'Durée', 'Client', 'Projet', 'Activité', 'Heures', 'Commentaire'];
    const rows = entrees.map(e => [
      e.date,
      e.heureDebut || '—',
      e.heureFin || '—',
      this.fmtDuree(e.heureDebut || '', e.heureFin || ''),
      e.clientNom || '—',
      e.projetNom || '—',
      e.activiteNom || '—',
      this.fmt(e.minutesTravaillees),
      e.commentaire || ''
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `entrees-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  peutEditer(e: EntreeFT): boolean { return e.feuilleStatut === 'BROUILLON' || e.feuilleStatut === 'REJETEE'; }
}