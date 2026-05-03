import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandeService } from '../../../services/demande.service';
import { NomenclatureService } from '../../../services/nomenclature.service';
import { UserService } from '../../../services/user.service';
import { KeycloakService } from '../../../services/keycloak.service';
import { UiService } from '../../../services/ui.service';
import { Demande, TypeDemande, StatutDemande } from '../../../shared/models/demande.model';
import { Utilisateur } from '../../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-admin-demandes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-demandes.component.html',
  styleUrls: ['./admin-demandes.component.css']
})
export class AdminDemandesComponent implements OnInit {
  private demandeService = inject(DemandeService);
  private nomenclature   = inject(NomenclatureService);
  private userService    = inject(UserService);
  private keycloak       = inject(KeycloakService);
  private ui             = inject(UiService);

  demandes     = signal<Demande[]>([]);
  types        = signal<TypeDemande[]>([]);
  statuts      = signal<StatutDemande[]>([]);
  utilisateurs = signal<Utilisateur[]>([]);
  loading      = signal(false);

  // Filtre
  filterOpen     = signal(false);
  searchText     = signal('');
  filterStatutId = signal<number | null>(null);
  filterTypeId   = signal<number | null>(null);

  // Sélection
  selectedIds = signal<Set<number>>(new Set());

  // Modal traitement
  traitementModal  = signal<Demande | null>(null);
  commentaireRH    = signal('');
  selectedStatutId = signal<number | null>(null);
  traitLoading     = signal(false);
  traitError       = signal<string | null>(null);

  // Popup commentaire
  commentPopup = signal<string | null>(null);

  // Pagination
  pageSize    = 10;
  currentPage = signal(1);

  ngOnInit(): void {
    this.nomenclature.getAllTypes().subscribe({ next: t => this.types.set(t), error: () => {} });
    this.nomenclature.getAllStatuts().subscribe({ next: s => this.statuts.set(s), error: () => {} });
    this.userService.getAllUsers().subscribe({ next: u => this.utilisateurs.set(u), error: () => {} });
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.demandeService.getAll().subscribe({
      next: d => { this.demandes.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // ── Computed ──
  idEnAttente    = computed(() => this.statuts().find(s => s.code === 'EN_ATTENTE')?.id ?? -1);
  idAcceptee     = computed(() => this.statuts().find(s => s.code === 'ACCEPTEE')?.id  ?? -1);
  idRejetee      = computed(() => this.statuts().find(s => s.code === 'REJETEE')?.id   ?? -1);
  countEnAttente = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idEnAttente()).length);
  countAcceptee  = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idAcceptee()).length);
  countRejetee   = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idRejetee()).length);

  filtered = computed(() => {
    let list = this.demandes();
    const s = this.searchText().toLowerCase();
    if (s) list = list.filter(d => d.sujet.toLowerCase().includes(s) || (d.utilisateurNom ?? '').toLowerCase().includes(s) || this.getTypeName(d.typeDemandeId).toLowerCase().includes(s));
    if (this.filterStatutId()) list = list.filter(d => d.statutDemandeId === this.filterStatutId());
    if (this.filterTypeId())   list = list.filter(d => d.typeDemandeId   === this.filterTypeId());
    return list;
  });

  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  activeFiltersCount = computed(() => (this.filterStatutId() ? 1 : 0) + (this.filterTypeId() ? 1 : 0));

  allPageSelected = computed(() => {
    const p = this.paged();
    return p.length > 0 && p.every(d => this.selectedIds().has(d.id));
  });
  somePageSelected = computed(() => {
    const p = this.paged();
    return p.some(d => this.selectedIds().has(d.id)) && !this.allPageSelected();
  });

  isRejeteSelected = computed(() => this.statuts().find(s => s.id === this.selectedStatutId())?.code === 'REJETEE');

  // ── Helpers ──
  getTypeName(id: number)  { return this.types().find(t => t.id === id)?.libelle ?? '—'; }
  getStatut(id: number)    { return this.statuts().find(s => s.id === id); }

  getStatutBadgeClass(id: number): string {
    const code = this.statuts().find(s => s.id === id)?.code ?? '';
    switch (code) {
      case 'EN_ATTENTE': return 'dt-badge dt-badge-pending';
      case 'ACCEPTEE':   return 'dt-badge dt-badge-delivered';
      case 'REJETEE':    return 'dt-badge dt-badge-canceled';
      default:           return 'dt-badge dt-badge-default';
    }
  }

  isEnAttente(d: Demande): boolean { return this.getStatut(d.statutDemandeId)?.code === 'EN_ATTENTE'; }

  getUser(d: Demande): Utilisateur | undefined {
    return this.utilisateurs().find(u => u.id === d.utilisateurId);
  }

  getUserInitiales(d: Demande): string {
    const u = this.getUser(d);
    if (u) return `${(u.prenom || '?').charAt(0)}${(u.nom || '').charAt(0)}`.toUpperCase();
    const nom = d.utilisateurNom ?? 'U';
    return nom.split(' ').slice(0, 2).map(n => n.charAt(0)).join('').toUpperCase() || 'U';
  }

  getUserPhoto(d: Demande): string | null { return this.getUser(d)?.photoUrl || null; }
  getUserEmail(d: Demande): string { return this.getUser(d)?.email || ''; }

  fmtDate(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]}, ${dt.getFullYear()}`;
  }

  // ── Sélection ──
  toggleSelectAll(): void {
    const paged = this.paged();
    if (this.allPageSelected()) {
      const s = new Set(this.selectedIds()); paged.forEach(d => s.delete(d.id)); this.selectedIds.set(s);
    } else {
      const s = new Set(this.selectedIds()); paged.forEach(d => s.add(d.id)); this.selectedIds.set(s);
    }
  }
  toggleSelect(id: number, event: Event): void {
    event.stopPropagation();
    const s = new Set(this.selectedIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedIds.set(s);
  }
  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  clearSelection(): void { this.selectedIds.set(new Set()); }

  // ── Filtre ──
  toggleFilter(): void { this.filterOpen.update(v => !v); }
  resetFilters(): void { this.filterStatutId.set(null); this.filterTypeId.set(null); this.searchText.set(''); this.currentPage.set(1); }

  // ── Modal traitement ──
  openTraitement(d: Demande): void {
    this.traitementModal.set(d);
    this.commentaireRH.set(d.commentaireRH ?? '');
    this.selectedStatutId.set(d.statutDemandeId);
    this.traitError.set(null);
  }
  closeTraitement(): void { this.traitementModal.set(null); }

  confirmerTraitement(): void {
    const d = this.traitementModal();
    const sid = this.selectedStatutId();
    if (!d || !sid) { this.traitError.set('Veuillez sélectionner un statut.'); return; }
    if (this.isRejeteSelected() && !this.commentaireRH().trim()) { this.traitError.set('Commentaire obligatoire pour un rejet.'); return; }
    this.traitLoading.set(true);
    const traitePar = this.keycloak.getKeycloakUserId() ?? '';
    this.demandeService.traiter(d.id, sid, traitePar, this.commentaireRH()).subscribe({
      next: () => { this.traitementModal.set(null); this.ui.success('Demande traitée.'); this.loadAll(); this.traitLoading.set(false); },
      error: (err: HttpErrorResponse) => { this.traitError.set(err.error?.message || 'Erreur.'); this.traitLoading.set(false); }
    });
  }

  showComment(d: Demande, event: Event): void { event.stopPropagation(); this.commentPopup.set(d.commentaireRH ?? null); }
  closeComment(): void { this.commentPopup.set(null); }
  goPage(p: number): void { this.currentPage.set(Math.max(1, Math.min(p, this.totalPages()))); }
  minVal(a: number, b: number): number { return Math.min(a, b); }
}