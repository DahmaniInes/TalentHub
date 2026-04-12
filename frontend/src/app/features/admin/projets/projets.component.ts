// src/app/features/admin/projets/projets.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjetService } from '../../../services/projet.service';
import { ClientService } from '../../../services/client.service';
import { MembreEquipeService } from '../../../services/membre-equipe.service';
import { ActiviteService } from '../../../services/activite.service';
// ✅ CORRIGÉ — import StatutActiviteService (pas NomenclatureService)
import { StatutActiviteService } from '../../../services/statutactivite.service';
import { UserService } from '../../../services/user.service';
import { UiService } from '../../../services/ui.service';
import { ErrorService } from '../../../services/error.service';
import { Projet, ProjetRequest } from '../../../shared/models/projet.model';
import { Client } from '../../../shared/models/client.model';
import { MembreEquipe, AddMembreRequest } from '../../../shared/models/membre-equipe.model';
import { Activite, ActiviteRequest } from '../../../shared/models/activite.model';
import { StatutActivite } from '../../../shared/models/statut-activite.model';
import { Utilisateur } from '../../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-projets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projets.component.html',
  styleUrls: ['./projets.component.css']
})
export class ProjetsComponent implements OnInit {
  private projetSvc   = inject(ProjetService);
  private clientSvc   = inject(ClientService);
  private membreSvc   = inject(MembreEquipeService);
  private activiteSvc = inject(ActiviteService);
  // ✅ CORRIGÉ — injection StatutActiviteService
  private nomencSvc   = inject(StatutActiviteService);
  private userSvc     = inject(UserService);
  private errorSvc    = inject(ErrorService);
  readonly ui         = inject(UiService);

  // ── Données ──
  projets         = signal<Projet[]>([]);
  clients         = signal<Client[]>([]);
  utilisateurs    = signal<Utilisateur[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);
  membres         = signal<MembreEquipe[]>([]);
  activites       = signal<Activite[]>([]);

  // ── State ──
  loading        = signal(true);
  selectedProjet = signal<Projet | null>(null);
  detailTab      = signal<'infos' | 'equipe' | 'activites'>('infos');
  viewMode       = signal<'liste' | 'kanban'>('liste');

  // ── Filtres ──
  filterStatut = signal('');
  filterClient = signal<number | ''>('');
  search       = signal('');

  // ── Modals ──
  showProjetModal   = signal(false);
  showMembreModal   = signal(false);
  showActiviteModal = signal(false);
  editingProjet     = signal<Projet | null>(null);
  editingActivite   = signal<Activite | null>(null);

  // ── Formulaires ──
  projetForm = signal<ProjetRequest>({
    nom: '', description: '', couleur: '#6366f1', statut: 'PLANIFIE',
    typeBudget: 'ILLIMITE', visible: true, facturable: true, autoriserActivitesGlobales: false
  });
  projetFormClientId = signal<number | null>(null);

  membreForm = signal({
    utilisateurId: 0,
    role: 'MEMBRE',
    quotaHoraire: undefined as number | undefined
  });

  activiteForm = signal<ActiviteRequest>({
    nom: '', description: '', couleur: '#10b981', statutActiviteId: 1,
    typeBudget: 'ILLIMITE', visible: true, facturable: true, priorite: 2
  });

  readonly COULEURS = [
    '#6366f1','#8b5cf6','#c026d3','#ec4899',
    '#ef4444','#f97316','#eab308','#22c55e',
    '#10b981','#06b6d4','#3b82f6','#64748b'
  ];
  readonly STATUTS_PROJET = ['PLANIFIE','EN_COURS','SUSPENDU','TERMINE','ANNULE'];
  readonly TYPES_BUDGET   = ['MENSUEL','TRIMESTRIEL','ANNUEL','ILLIMITE'];
  readonly ROLES          = ['MEMBRE','LEAD','OBSERVATEUR','ADMIN'];

  filteredProjets = computed(() => {
    let list = this.projets();
    const q  = this.search().toLowerCase();
    if (this.filterStatut()) list = list.filter(p => p.statut === this.filterStatut());
    if (this.filterClient()) list = list.filter(p => p.clientId === +this.filterClient());
    if (q) list = list.filter(p =>
      p.nom.toLowerCase().includes(q) ||
      (p.clientNom || '').toLowerCase().includes(q) ||
      (p.numeroProjet || '').toLowerCase().includes(q)
    );
    return list;
  });

  utilisateursDispo = computed(() => {
    const membresIds = new Set(this.membres().map(m => m.utilisateurId));
    return this.utilisateurs().filter(u => !membresIds.has(u.id));
  });

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    this.projetSvc.getAll().subscribe({
      next: d => { this.projets.set(d); this.loading.set(false); },
      error: () => { this.ui.error('Erreur chargement projets.'); this.loading.set(false); }
    });
    this.clientSvc.getAll(true).subscribe({ next: d => this.clients.set(d) });
    this.userSvc.getAllUsers().subscribe({ next: d => this.utilisateurs.set(d) });
    // ✅ Appel via la méthode correcte de StatutActiviteService
    this.nomencSvc.getStatutsActivite().subscribe({ next: d => this.statutsActivite.set(d) });
  }

  selectProjet(projet: Projet): void {
    this.selectedProjet.set(projet);
    this.detailTab.set('infos');
    this.loadMembres(projet.id);
    this.loadActivites(projet.id);
  }

  loadMembres(id: number): void {
    this.membreSvc.getByProjet(id).subscribe({ next: d => this.membres.set(d) });
  }

  loadActivites(id: number): void {
    this.activiteSvc.getByProjet(id).subscribe({ next: d => this.activites.set(d) });
  }

  // ── CRUD Projet ──
  openAddProjet(): void {
    this.editingProjet.set(null);
    this.projetFormClientId.set(null);
    this.projetForm.set({
      nom:'', description:'', couleur:'#6366f1', statut:'PLANIFIE',
      typeBudget:'ILLIMITE', visible:true, facturable:true, autoriserActivitesGlobales:false
    });
    this.showProjetModal.set(true);
  }

  openEditProjet(projet: Projet): void {
    this.editingProjet.set(projet);
    this.projetFormClientId.set(projet.clientId || null);
    this.projetForm.set({
      nom: projet.nom, description: projet.description || '', couleur: projet.couleur || '#6366f1',
      clientId: projet.clientId, statut: projet.statut, budgetPrevu: projet.budgetPrevu,
      quotaHoraire: projet.quotaHoraire, typeBudget: projet.typeBudget || 'ILLIMITE',
      dateDebut: projet.dateDebut, dateFin: projet.dateFin,
      visible: projet.visible, facturable: projet.facturable,
      autoriserActivitesGlobales: projet.autoriserActivitesGlobales,
      responsableKeycloakId: projet.responsableKeycloakId
    });
    this.showProjetModal.set(true);
  }

  saveProjet(): void {
    const f = { ...this.projetForm(), clientId: this.projetFormClientId() || undefined };
    if (!f.nom?.trim()) { this.ui.warning('Le nom du projet est obligatoire.'); return; }
    const editing = this.editingProjet();
    const obs = editing ? this.projetSvc.update(editing.id, f) : this.projetSvc.create(f);
    obs.subscribe({
      next: () => {
        this.ui.success(editing ? 'Projet mis à jour.' : 'Projet créé.');
        this.closeProjetModal();
        this.loadAll();
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  deleteProjet(projet: Projet): void {
    this.ui.confirm({
      title: 'Supprimer le projet',
      message: `Supprimer "${projet.nom}" et toutes ses activités ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        this.projetSvc.delete(projet.id).subscribe({
          next: () => {
            this.ui.success('Projet supprimé.');
            if (this.selectedProjet()?.id === projet.id) this.selectedProjet.set(null);
            this.loadAll();
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  closeProjetModal(): void { this.showProjetModal.set(false); this.editingProjet.set(null); }

  // ── CRUD Membres ──
  openAddMembre(): void {
    this.membreForm.set({ utilisateurId: 0, role: 'MEMBRE', quotaHoraire: undefined });
    this.showMembreModal.set(true);
  }

  saveMembre(): void {
    const projet = this.selectedProjet();
    const f = this.membreForm();
    if (!projet || !f.utilisateurId) { this.ui.warning('Sélectionnez un utilisateur.'); return; }
    this.membreSvc.addMembre({
      projetId: projet.id,
      utilisateurId: f.utilisateurId,
      role: f.role as any,
      quotaHoraire: f.quotaHoraire
    }).subscribe({
      next: () => {
        this.ui.success('Membre ajouté.');
        this.showMembreModal.set(false);
        this.loadMembres(projet.id);
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  removeMembre(m: MembreEquipe): void {
    const projet = this.selectedProjet();
    if (!projet) return;
    this.ui.confirm({
      title: 'Retirer le membre',
      message: `Retirer ${m.utilisateurPrenom} ${m.utilisateurNom} ?`,
      confirmLabel: 'Retirer', type: 'warning',
      onConfirm: () => {
        this.membreSvc.removeMembre(projet.id, m.utilisateurId).subscribe({
          next: () => { this.ui.success('Membre retiré.'); this.loadMembres(projet.id); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  // ── CRUD Activités ──
  openAddActivite(): void {
    this.editingActivite.set(null);
    const defaultStatut = this.statutsActivite()[0];
    this.activiteForm.set({
      nom:'', description:'', couleur:'#10b981',
      statutActiviteId: defaultStatut?.id || 1,
      typeBudget:'ILLIMITE', visible:true, facturable:true, priorite:2,
      projetId: this.selectedProjet()?.id
    });
    this.showActiviteModal.set(true);
  }

  openEditActivite(a: Activite): void {
    this.editingActivite.set(a);
    this.activiteForm.set({
      nom: a.nom, description: a.description || '', couleur: a.couleur || '#10b981',
      statutActiviteId: a.statutActiviteId, budget: a.budget, quotaHoraire: a.quotaHoraire,
      typeBudget: a.typeBudget || 'ILLIMITE', visible: a.visible, facturable: a.facturable,
      priorite: a.priorite, dateEcheance: a.dateEcheance, heuresEstimees: a.heuresEstimees,
      utilisateurId: a.utilisateurId, projetId: a.projetId
    });
    this.showActiviteModal.set(true);
  }

  saveActivite(): void {
    const f = this.activiteForm();
    if (!f.nom?.trim()) { this.ui.warning('Le nom de l\'activité est obligatoire.'); return; }
    const editing = this.editingActivite();
    const obs = editing
      ? this.activiteSvc.update(editing.id, f)
      : this.activiteSvc.create(f);
    obs.subscribe({
      next: () => {
        this.ui.success(editing ? 'Activité mise à jour.' : 'Activité créée.');
        this.showActiviteModal.set(false);
        this.editingActivite.set(null);
        const p = this.selectedProjet();
        if (p) this.loadActivites(p.id);
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  changerStatutActivite(activite: Activite, statutId: number): void {
    this.activiteSvc.changerStatut(activite.id, statutId).subscribe({
      next: () => { const p = this.selectedProjet(); if (p) this.loadActivites(p.id); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  deleteActivite(a: Activite): void {
    this.ui.confirm({
      title: 'Supprimer l\'activité', message: `Supprimer "${a.nom}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        this.activiteSvc.delete(a.id).subscribe({
          next: () => { const p = this.selectedProjet(); if (p) this.loadActivites(p.id); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  // ── Helpers ──
  getStatutColor(statut: string): string {
    const map: Record<string, string> = {
      PLANIFIE: '#6366f1', EN_COURS: '#10b981',
      SUSPENDU: '#f97316', TERMINE: '#64748b', ANNULE: '#ef4444'
    };
    return map[statut] || '#94a3b8';
  }

  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      PLANIFIE: 'Planifié', EN_COURS: 'En cours',
      SUSPENDU: 'Suspendu', TERMINE: 'Terminé', ANNULE: 'Annulé'
    };
    return map[statut] || statut;
  }

  getPrioriteLabel(p: number): string {
    return ['', 'Basse', 'Normale', 'Haute', 'Urgente'][p] || 'Normale';
  }

  getPrioriteCouleur(p: number): string {
    return ['', '#10b981', '#3b82f6', '#f97316', '#ef4444'][p] || '#3b82f6';
  }

  getStatutActiviteById(id: number): StatutActivite | undefined {
    return this.statutsActivite().find(s => s.id === id);
  }

  getActivitesByStatut(statutId: number): Activite[] {
    return this.activites().filter(a => a.statutActiviteId === statutId);
  }
}