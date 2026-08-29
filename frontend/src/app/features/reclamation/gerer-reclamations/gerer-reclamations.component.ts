// gerer-reclamations.component.ts — CORRIGÉ COMPLET
import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReclamationService }       from '../../../services/reclamation.service';
import { UserService }              from '../../../services/user.service';
import { UiService }                from '../../../services/ui.service';
import { ErrorService }             from '../../../services/error.service';
import { KeycloakService }          from '../../../services/keycloak.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { NotificationService }      from '../../../services/notification.service';
import { Reclamation, ServiceReclamation, StatutReclamation } from '../../../shared/models/reclamation.model';
import { Utilisateur }              from '../../../shared/models/utilisateur.model';
import { HttpErrorResponse }        from '@angular/common/http';
import { Subscription }             from 'rxjs';

type StatutTab = 'EN_ATTENTE' | 'EN_COURS' | 'RESOLUE' | 'REJETEE';

@Component({
  selector: 'app-gerer-reclamations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gerer-reclamations.component.html',
  styleUrls: ['./gerer-reclamations.component.css']
})
export class GererReclamationsComponent implements OnInit, OnDestroy {

  private recSvc    = inject(ReclamationService);
  private userSvc   = inject(UserService);
  private keycloak  = inject(KeycloakService);
  readonly ui       = inject(UiService);
  private errorSvc  = inject(ErrorService);
  readonly perms    = inject(PermissionContextService);
  private notifSvc  = inject(NotificationService);
  private subs      = new Subscription();

  reclamations  = signal<Reclamation[]>([]);
  utilisateurs  = signal<Utilisateur[]>([]);
  services      = signal<ServiceReclamation[]>([]);
  statuts       = signal<StatutReclamation[]>([]);
  currentKcId   = signal('');
  currentUser   = signal<Utilisateur | null>(null);
  loading       = signal(false);

  detailRec        = signal<Reclamation | null>(null);
  showTraiter      = signal(false);
  openMenuId       = signal<number | null>(null);
  filterOpen       = signal(false);
  newComment       = signal('');
  savingComment    = signal(false);
  traiterStatutId  = signal<number | null>(null);
  traiterCommentaire = signal('');
  saving           = signal(false);

  // ✅ NOUVEAU — onglet de statut actif (une seule liste affichée à la fois)
  statutTab = signal<StatutTab>('EN_ATTENTE');

  searchText      = signal('');
  filterServiceId = signal<number | null>(null);
  page            = signal(1);
  pageSize        = 20;

  ngOnInit(): void {
    if (!this.perms.canViewAllRec() && !this.perms.canTreatRec()) return;
    this.recSvc.getAllServices().subscribe({ next: d => this.services.set(d) });
    this.recSvc.getAllStatuts().subscribe({ next: d => this.statuts.set(d) });
    this.userSvc.getAllUsers().subscribe({ next: d => this.utilisateurs.set(d) });
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.currentKcId.set(kcId);
      this.userSvc.getUserByKeycloakId(kcId).subscribe({ next: u => this.currentUser.set(u) });
    }
    this.loadAll();
    this.subs.add(this.notifSvc.newNotification$.subscribe(n => {
      const t = String(n.type);
      if (t === 'RECLAMATION_SOUMISE' || t === 'RECLAMATION_COMMENTEE') this.loadAll();
    }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  loadAll(): void {
    this.loading.set(true);
    this.recSvc.getAll().subscribe({
      next: d => { this.reclamations.set(d); this.loading.set(false); this.enrichir(); },
      error: () => this.loading.set(false)
    });
  }

  private enrichir(): void {
    this.reclamations.update(recs => recs.map(r => this.enrichirRec(r)));
  }

  // ✅ MODIFIÉ — filtre désormais TOUJOURS par l'onglet de statut actif,
  // en plus de la recherche texte et du filtre service — une seule liste
  // à la fois, plus de surcharge visuelle.
  filteredRecs = computed(() => {
    let list = this.reclamations().filter(r => r.statutCode === this.statutTab());
    const q  = this.searchText().toLowerCase();
    if (q) list = list.filter(r =>
      r.sujet.toLowerCase().includes(q) ||
      (r.utilisateurNom || '').toLowerCase().includes(q) ||
      (r.serviceNom || '').toLowerCase().includes(q));
    if (this.filterServiceId()) list = list.filter(r => r.serviceReclamationId === this.filterServiceId());
    return list;
  });

  pagedRecs  = computed(() => this.filteredRecs().slice((this.page()-1)*this.pageSize, this.page()*this.pageSize));
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRecs().length / this.pageSize)));
  pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i+1));
  hasFilters = computed(() => !!(this.filterServiceId() || this.searchText()));
  activeFiltersCount = computed(() => (this.filterServiceId() ? 1 : 0));

  countByStatut(code: string): number {
    return this.reclamations().filter(r => r.statutCode === code).length;
  }

  // ✅ NOUVEAU — bascule d'onglet de statut, remet la pagination à 1
  setStatutTab(tab: StatutTab): void {
    this.statutTab.set(tab);
    this.page.set(1);
    this.closeAllMenus();
  }

  // ── Détail ──
  voirDetail(r: Reclamation): void {
    this.recSvc.getById(r.id).subscribe({
      next: full => {
        this.detailRec.set(this.enrichirRec(full));
        this.showTraiter.set(false);
      }
    });
    this.closeAllMenus();
  }

  fermerDetail(): void {
    this.detailRec.set(null);
    this.showTraiter.set(false);
    this.newComment.set('');
    this.traiterStatutId.set(null);
    this.traiterCommentaire.set('');
  }

  ouvrirFormTraiter(): void { this.showTraiter.set(true); }

  annulerTraitement(): void {
    this.showTraiter.set(false);
    this.traiterStatutId.set(null);
    this.traiterCommentaire.set('');
  }

  // ── Traitement ──
  ouvrirTraiter(r: Reclamation): void {
    if (!this.perms.canTreatRec()) { this.ui.warning('Permission RECLAMATION_TREAT requise.'); return; }
    this.voirDetail(r);
    this.traiterStatutId.set(null);
    this.traiterCommentaire.set('');
    this.showTraiter.set(true);
  }

  confirmerTraitement(): void {
    const rec    = this.detailRec();
    const statId = this.traiterStatutId();
    if (!rec || !statId) { this.ui.warning('Choisissez un statut.'); return; }
    const statut = this.statuts().find(s => s.id === statId);
    this.saving.set(true);
    this.recSvc.traiter(rec.id, statId, this.traiterCommentaire(), statut?.code || '').subscribe({
      next: updated => {
        this.reclamations.update(rs => rs.map(r => r.id === updated.id ? this.enrichirRec(updated) : r));
        this.detailRec.set(this.enrichirRec(updated));
        this.showTraiter.set(false);
        this.ui.success('Réclamation traitée ✅');
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error(this.errorSvc.parse(err).message);
        this.saving.set(false);
      }
    });
  }

  // ── Commentaire agent ──
  envoyerCommentaire(): void {
    const rec  = this.detailRec();
    const user = this.currentUser();
    const txt  = this.newComment().trim();
    if (!rec || !txt) return;
    if (!this.perms.canCommentRec() && !this.perms.canTreatRec()) {
      this.ui.warning('Permission RECLAMATION_COMMENT requise.'); return;
    }
    this.savingComment.set(true);
    const nom = `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Agent';
    this.recSvc.ajouterCommentaire(rec.id, txt, nom, true).subscribe({
      next: updated => {
        this.detailRec.set(this.enrichirRec(updated));
        this.reclamations.update(rs => rs.map(r => r.id === updated.id ? this.enrichirRec(updated) : r));
        this.newComment.set('');
        this.savingComment.set(false);
      },
      error: () => { this.ui.error('Erreur.'); this.savingComment.set(false); }
    });
  }

  // ── Menu 3 points ──
  toggleMenu(id: number, e: Event): void {
    e.stopPropagation();
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  closeAllMenus(): void {
    this.openMenuId.set(null);
    this.filterOpen.set(false);
  }

  private enrichirRec(r: Reclamation): Reclamation {
    const u = this.utilisateurs().find(u => u.id === r.utilisateurId);
    return {
      ...r,
      utilisateurNom:   r.utilisateurNom   || (u ? `${u.prenom} ${u.nom}` : '—'),
      utilisateurEmail: r.utilisateurEmail || u?.email || '',
      serviceNom: this.services().find(s => s.id === r.serviceReclamationId)?.libelle || '—',
      statutNom:  this.statuts().find(s => s.id === r.statutReclamationId)?.libelle || '—',
      statutCode: this.statuts().find(s => s.id === r.statutReclamationId)?.code || ''
    };
  }

  getUtilisateur(r: Reclamation): Utilisateur | undefined {
    return this.utilisateurs().find(u => u.id === r.utilisateurId);
  }

  getBadgeClass(code?: string): string {
    switch (code) {
      case 'EN_ATTENTE': return 'dt-badge dt-badge-pending';
      case 'EN_COURS':   return 'dt-badge dt-badge-accent';
      case 'RESOLUE':    return 'dt-badge dt-badge-delivered';
      case 'REJETEE':    return 'dt-badge dt-badge-canceled';
      default:           return 'dt-badge dt-badge-default';
    }
  }

  getInitiales(nom?: string): string {
    if (!nom) return '?';
    const p = nom.trim().split(' ');
    return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : nom.substring(0,2).toUpperCase();
  }

  getAvatarColor(nom: string): string {
    const c = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6'];
    return c[(nom || '').charCodeAt(0) % c.length];
  }

  isImage(url?: string): boolean {
    return !!(url && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url));
  }

  fmtDate(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const M  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(dt.getDate()).padStart(2,'0')} ${M[dt.getMonth()]}, ${dt.getFullYear()}`;
  }

  fmtDateTime(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    return this.fmtDate(d) + ' à ' + dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  resetFilters(): void {
    this.filterServiceId.set(null);
    this.searchText.set('');
    this.page.set(1);
  }

  goPage(p: number): void { this.page.set(Math.max(1, Math.min(p, this.totalPages()))); }
  minVal(a: number, b: number): number { return Math.min(a, b); }
}