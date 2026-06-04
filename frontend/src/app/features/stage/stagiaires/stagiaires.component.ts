import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StagiaireService }         from '../../../services/stagiaire.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { UiService }                from '../../../services/ui.service';
import { Utilisateur }              from '../../../shared/models/utilisateur.model';

@Component({
  selector: 'app-stagiaires',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stagiaires.component.html'
})
export class StagiairesComponent implements OnInit {
  private svc    = inject(StagiaireService);
  readonly perms = inject(PermissionContextService);
  readonly ui    = inject(UiService);
  private router = inject(Router);

  stagiaires      = signal<Utilisateur[]>([]);
  typesStage      = signal<any[]>([]);
  superviseurs    = signal<Utilisateur[]>([]);
  loading         = signal(false);
  saving          = signal(false);

  search          = signal('');
  filterTypeStage = signal('');
  filterStatut    = signal('');
  filterOpen      = signal(false);
  page            = signal(1);
  readonly pageSize = 15;

  detailStagiaire = signal<Utilisateur | null>(null);
  tab             = signal<'infos' | 'stage' | 'superviseurs'>('infos');
  editForm        = signal<any>({});
  openMenuId      = signal<number | null>(null);

  filteredStagiaires = computed(() => {
    let list = this.stagiaires();
    const q = this.search().toLowerCase();
    if (q) list = list.filter(s =>
      (s.nomComplet || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.universite || '').toLowerCase().includes(q));
    if (this.filterTypeStage())
      list = list.filter(s => String(s.typeStageId) === this.filterTypeStage());
    if (this.filterStatut() === 'actif')   list = list.filter(s => s.actif);
    if (this.filterStatut() === 'inactif') list = list.filter(s => !s.actif);
    return list;
  });

  pagedStagiaires = computed(() => {
    const s = (this.page() - 1) * this.pageSize;
    return this.filteredStagiaires().slice(s, s + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredStagiaires().length / this.pageSize)));
  pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  statsActifs = computed(() => this.stagiaires().filter(s => s.actif).length);
  hasFilters  = computed(() => !!this.filterTypeStage() || !!this.filterStatut() || !!this.search());

  superviseursAssignes = computed(() => {
    const s = this.detailStagiaire();
    if (!s?.superviseurIds) return [];
    return this.superviseurs().filter(u => s.superviseurIds!.includes(u.id));
  });

  superviseursDispo = computed(() => {
    const s = this.detailStagiaire();
    const assignes = s?.superviseurIds || [];
    return this.superviseurs().filter(u => !assignes.includes(u.id));
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.svc.getAll().subscribe({ next: d => { this.stagiaires.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
    this.svc.getTypesStage().subscribe({ next: d => this.typesStage.set(d) });
    this.svc.getSuperviseurs().subscribe({ next: d => this.superviseurs.set(d) });
  }

  goToAdd(): void { this.router.navigate(['/add-user'], { queryParams: { stagiaire: true } }); }

  openDetail(s: Utilisateur): void {
    this.detailStagiaire.set(s);
    this.tab.set('infos');
    this.editForm.set({
      prenom: s.prenom, nom: s.nom, telephone: s.telephone,
      universite: s.universite, specialite: s.specialite, niveauEtude: s.niveauEtude,
      typeStageId: s.typeStageId,
      dateDebutStage: s.dateDebutStage, dateFinStage: s.dateFinStage, dateSoutenance: s.dateSoutenance
    });
  }

  fermerDetail(): void { this.detailStagiaire.set(null); }

  sauvegarder(): void {
    const s = this.detailStagiaire();
    if (!s) return;
    this.saving.set(true);
    this.svc.update(s.id, this.editForm()).subscribe({
      next: updated => {
        this.stagiaires.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.detailStagiaire.set(updated);
        this.saving.set(false);
        this.ui.success('Stagiaire mis à jour ✅');
      },
      error: () => { this.saving.set(false); this.ui.error('Erreur lors de la sauvegarde.'); }
    });
  }

  ajouterSuperviseur(supId: number): void {
    const s = this.detailStagiaire();
    if (!s || !supId) return;
    const ids = [...(s.superviseurIds || []), supId];
    this.svc.assignerSuperviseurs(s.id, ids).subscribe({
      next: updated => { this.detailStagiaire.set(updated); this.stagiaires.update(l => l.map(u => u.id === updated.id ? updated : u)); }
    });
  }

  retirerSuperviseur(supId: number): void {
    const s = this.detailStagiaire();
    if (!s) return;
    this.svc.retirerSuperviseur(s.id, supId).subscribe({
      next: updated => { this.detailStagiaire.set(updated); this.stagiaires.update(l => l.map(u => u.id === updated.id ? updated : u)); }
    });
  }

  resetFilters(): void { this.search.set(''); this.filterTypeStage.set(''); this.filterStatut.set(''); this.page.set(1); }
  goPage(p: number): void { if (p >= 1 && p <= this.totalPages()) this.page.set(p); }
  minVal(a: number, b: number): number { return Math.min(a, b); }
  closeMenu(): void { this.openMenuId.set(null); }

  getTypeStageLibelle(id: number): string {
    return this.typesStage().find(t => t.id === id)?.libelle ?? '—';
  }

  getInitiales(nom?: string): string {
    if (!nom) return '?';
    const p = nom.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : nom.substring(0, 2).toUpperCase();
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