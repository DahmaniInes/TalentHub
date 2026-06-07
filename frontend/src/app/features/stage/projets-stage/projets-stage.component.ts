import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjetStageService }       from '../../../services/projet-stage-service.service';
import { StagiaireService }         from '../../../services/stagiaire.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { KeycloakService }          from '../../../services/keycloak.service';
import { UserService }              from '../../../services/user.service';
import { UiService }                from '../../../services/ui.service';
import { ProjetStage }              from '../../../shared/models/projet-stage.model';
import { Utilisateur }              from '../../../shared/models/utilisateur.model';

@Component({
  selector: 'app-projets-stage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projets-stage.component.html'
})
export class ProjetsStageComponent implements OnInit {

  private svc      = inject(ProjetStageService);
  private stagSvc  = inject(StagiaireService);
  private userSvc  = inject(UserService);
  private keycloak = inject(KeycloakService);
  readonly perms   = inject(PermissionContextService);
  readonly ui      = inject(UiService);
  private router   = inject(Router);

  projets    = signal<ProjetStage[]>([]);
  stagiaires = signal<Utilisateur[]>([]);
  loading    = signal(false);
  saving     = signal(false);

  currentUserId = signal<number | null>(null);

  search       = signal('');
  filterStatut = signal('');
  filterOpen   = signal(false);
  slideOpen    = signal(false);
  editingId    = signal<number | null>(null);

  selectedIds = signal<Set<number>>(new Set());

  form = signal<any>({
    titre: '', description: '', dateDebut: '', dateFin: '',
    statut: 'EN_COURS', avancement: 0, stagiaireIds: []
  });

  filtered = computed(() => {
    let list = this.projets();
    const q = this.search().toLowerCase();
    if (q) list = list.filter(p => p.titre.toLowerCase().includes(q));
    if (this.filterStatut()) list = list.filter(p => p.statut === this.filterStatut());
    return list;
  });

  statsEnCours  = computed(() => this.projets().filter(p => p.statut === 'EN_COURS').length);
  statsTermines = computed(() => this.projets().filter(p => p.statut === 'TERMINE').length);

  allPageSelected  = computed(() => this.filtered().length > 0 && this.filtered().every(p => this.selectedIds().has(p.id)));
  somePageSelected = computed(() => this.filtered().some(p => this.selectedIds().has(p.id)) && !this.allPageSelected());

  ngOnInit(): void {
    if (!this.perms.canSeeProjetsStageMenu()) return;
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => {
          this.currentUserId.set(u.id);
          this.loadProjets(u.id);
          this.stagSvc.getAll().subscribe({ next: d => this.stagiaires.set(d) });
        }
      });
    }
  }

  private loadProjets(userId: number): void {
    this.loading.set(true);
    // Logique basée sur les permissions uniquement
    if (this.perms.canViewAllProjetsStage()) {
      this.svc.getAll().subscribe({
        next: d => { this.projets.set(d); this.loading.set(false); },
        error: (e) => { console.error(e); this.loading.set(false); }
      });
    } else if (this.perms.canViewMyProjetsStage()) {
      this.svc.getBySuperviseur(userId).subscribe({
        next: d => { this.projets.set(d); this.loading.set(false); },
        error: (e) => { console.error(e); this.loading.set(false); }
      });
    } else if (this.perms.canViewMyProjet()) {
      this.svc.getByStagiaire(userId).subscribe({
        next: d => { this.projets.set(d); this.loading.set(false); },
        error: (e) => { console.error(e); this.loading.set(false); }
      });
    } else {
      this.projets.set([]);
      this.loading.set(false);
    }
  }

  // ── Sélection ──
  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  toggleSelect(id: number): void {
    this.selectedIds.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  toggleSelectAll(): void {
    if (this.allPageSelected()) {
      this.selectedIds.update(s => { const n = new Set(s); this.filtered().forEach(p => n.delete(p.id)); return n; });
    } else {
      this.selectedIds.update(s => { const n = new Set(s); this.filtered().forEach(p => n.add(p.id)); return n; });
    }
  }
  clearSelection(): void { this.selectedIds.set(new Set()); }

  openCreate(): void {
    this.editingId.set(null);
    this.form.set({ titre: '', description: '', dateDebut: '', dateFin: '', statut: 'EN_COURS', avancement: 0, stagiaireIds: [] });
    this.slideOpen.set(true);
  }

  openEdit(p: ProjetStage, e?: Event): void {
    e?.stopPropagation();
    this.editingId.set(p.id);
    this.form.set({
      titre: p.titre, description: p.description || '',
      dateDebut: p.dateDebut || '', dateFin: p.dateFin || '',
      statut: p.statut, avancement: p.avancement,
      stagiaireIds: [...(p.stagiaireIds || [])]
    });
    this.slideOpen.set(true);
  }

  openDetail(p: ProjetStage): void { this.router.navigate(['/projets-stage', p.id]); }
  closeSlide(): void { this.slideOpen.set(false); }

  toggleStagiaire(id: number): void {
    const ids: number[] = this.form().stagiaireIds || [];
    this.form.update(f => ({
      ...f, stagiaireIds: ids.includes(id)
        ? ids.filter((x: number) => x !== id)
        : [...ids, id]
    }));
  }
  isStagiaireSelected(id: number): boolean { return (this.form().stagiaireIds || []).includes(id); }

  save(): void {
    if (!this.form().titre?.trim()) { this.ui.warning('Le titre est obligatoire.'); return; }
    this.saving.set(true);
    const obs = this.editingId()
      ? this.svc.update(this.editingId()!, this.form())
      : this.svc.create(this.form());
    obs.subscribe({
      next: saved => {
        this.projets.update(list =>
          this.editingId() ? list.map(p => p.id === saved.id ? saved : p) : [...list, saved]
        );
        this.slideOpen.set(false);
        this.saving.set(false);
        this.ui.success(this.editingId() ? 'Projet mis à jour ✅' : 'Projet créé ✅');
      },
      error: () => { this.saving.set(false); this.ui.error('Erreur lors de la sauvegarde.'); }
    });
  }

  delete(p: ProjetStage, e?: Event): void {
    e?.stopPropagation();
    this.ui.confirm({
      title: 'Supprimer', message: `Supprimer "${p.titre}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this.svc.delete(p.id).subscribe({
        next: () => { this.projets.update(l => l.filter(x => x.id !== p.id)); this.ui.success('Supprimé.'); }
      })
    });
  }

  statutLabel(s: string): string {
    return ({ EN_COURS: 'En cours', TERMINE: 'Terminé', SUSPENDU: 'Suspendu' } as any)[s] ?? s;
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

  canEdit():   boolean { return this.perms.canEditProjetStage() || this.perms.canManageProjetStage(); }
  canDelete(): boolean { return this.perms.canDeleteProjetStage(); }
  canCreate(): boolean { return this.perms.canCreateProjetStage() || this.perms.canManageProjetStage(); }

  getInitiales(nom?: string): string {
    if (!nom) return '?';
    const p = nom.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : nom.substring(0, 2).toUpperCase();
  }

  getAvatarColor(nom: string): string {
    const c = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6'];
    return c[(nom || '').charCodeAt(0) % c.length];
  }
}