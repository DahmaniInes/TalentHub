// src/app/features/reclamation/pages/mes-reclamations/mes-reclamations.component.ts — CORRIGÉ
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReclamationService }       from '../../../services/reclamation.service';
import { UserService }              from '../../../services/user.service';
import { KeycloakService }          from '../../../services/keycloak.service';
import { UiService }                from '../../../services/ui.service';
import { ErrorService }             from '../../../services/error.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { NotificationService }      from '../../../services/notification.service';
import { Reclamation, ReclamationRequest, ServiceReclamation, StatutReclamation } from '../../../shared/models/reclamation.model';
import { Utilisateur }              from '../../../shared/models/utilisateur.model';
import { HttpErrorResponse }        from '@angular/common/http';
import { Subscription }             from 'rxjs';

@Component({
  selector: 'app-mes-reclamations',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './mes-reclamations.component.html',
  styleUrls: ['./mes-reclamations.component.css']
})
export class MesReclamationsComponent implements OnInit {

  private recSvc   = inject(ReclamationService);
  private userSvc  = inject(UserService);
  private keycloak = inject(KeycloakService);
  readonly ui      = inject(UiService);
  private errorSvc = inject(ErrorService);
  readonly perms   = inject(PermissionContextService);
  private notifSvc = inject(NotificationService);
  private fb       = inject(FormBuilder);
  private subs     = new Subscription();

  reclamations = signal<Reclamation[]>([]);
  services     = signal<ServiceReclamation[]>([]);
  statuts      = signal<StatutReclamation[]>([]);
  currentUser  = signal<Utilisateur | null>(null);
  loading      = signal(false);

  slideOpen      = signal(false);
  editingId      = signal<number | null>(null);
  detailRec      = signal<Reclamation | null>(null);
  slideError     = signal<string | null>(null);
  uploading      = signal(false);
  selectedFile   = signal<File | null>(null);
  uploadedUrl    = signal<string | null>(null);
  newComment     = signal('');
  savingComment  = signal(false);
  filterOpen     = signal(false);

  searchText      = signal('');
  filterStatutId  = signal<number | null>(null);
  filterServiceId = signal<number | null>(null);
  page            = signal(1);
  pageSize        = 10;

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      serviceReclamationId: [null, Validators.required],
      sujet:               ['', [Validators.required, Validators.minLength(3)]],
      description:         [''],
    });
  }

  ngOnInit(): void {
    if (!this.perms.canViewOwnRec() && !this.perms.canCreateReclamation()) return;
    this.recSvc.getAllServices().subscribe({ next: d => this.services.set(d.filter(s => s.actif)) });
    this.recSvc.getAllStatuts().subscribe({ next: d => this.statuts.set(d.filter(s => s.actif)) });
    this.loadUserAndData();
    this.subs.add(this.notifSvc.newNotification$.subscribe(n => {
      const t = String(n.type);
      if (t === 'RECLAMATION_RESOLUE' || t === 'RECLAMATION_REJETEE' ||
          t === 'RECLAMATION_COMMENTEE' || t === 'RECLAMATION_MISE_A_JOUR') {
        this.loadUserAndData();
      }
    }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  private loadUserAndData(): void {
    this.loading.set(true);
    const kcId = this.keycloak.getKeycloakUserId();
    if (!kcId) { this.loading.set(false); return; }
    this.userSvc.getUserByKeycloakId(kcId).subscribe({
      next: u => {
        this.currentUser.set(u);
        this.recSvc.getByUtilisateur(u.id).subscribe({
          next: d => { this.reclamations.set(d); this.loading.set(false); this.enrichir(); },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  private enrichir(): void {
    this.reclamations.update(recs => recs.map(r => ({
      ...r,
      serviceNom: this.services().find(s => s.id === r.serviceReclamationId)?.libelle || '—',
      statutNom:  this.statuts().find(s => s.id === r.statutReclamationId)?.libelle || '—',
      statutCode: this.statuts().find(s => s.id === r.statutReclamationId)?.code || ''
    })));
  }

  // ── Computed ──
  filteredRecs = computed(() => {
    let list = this.reclamations();
    const q  = this.searchText().toLowerCase();
    if (q) list = list.filter(r =>
      r.sujet.toLowerCase().includes(q) ||
      (r.serviceNom || '').toLowerCase().includes(q));
    if (this.filterStatutId())  list = list.filter(r => r.statutReclamationId === this.filterStatutId());
    if (this.filterServiceId()) list = list.filter(r => r.serviceReclamationId === this.filterServiceId());
    return list;
  });

  pagedRecs  = computed(() => this.filteredRecs().slice((this.page()-1)*this.pageSize, this.page()*this.pageSize));
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRecs().length / this.pageSize)));
  pagesArr   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i+1));
  hasFilters = computed(() => !!(this.filterStatutId() || this.filterServiceId() || this.searchText()));
  activeFiltersCount = computed(() => (this.filterStatutId() ? 1 : 0) + (this.filterServiceId() ? 1 : 0));

  countByStatut(code: string): number {
    return this.reclamations().filter(r => r.statutCode === code).length;
  }

  // ✅ FIX : méthode pour filtrer par code statut (interdit d'utiliser => dans les templates)
  filtrerParStatut(code: string): void {
    const statut = this.statuts().find(s => s.code === code);
    this.filterStatutId.set(statut?.id ?? null);
    this.page.set(1);
  }

  // ── Actions ──
  openCreate(): void {
    if (!this.perms.canCreateReclamation()) { this.ui.warning('Permission RECLAMATION_CREATE requise.'); return; }
    this.editingId.set(null);
    this.form.reset();
    this.uploadedUrl.set(null);
    this.selectedFile.set(null);
    this.slideError.set(null);
    this.slideOpen.set(true);
  }

  openEdit(r: Reclamation): void {
    if (!this.perms.canUpdateOwnRec() && !this.perms.canUpdateAllRec()) return;
    if (!this.peutModifier(r)) { this.ui.warning('Réclamation non modifiable dans cet état.'); return; }
    this.editingId.set(r.id);
    this.form.patchValue({ serviceReclamationId: r.serviceReclamationId, sujet: r.sujet, description: r.description });
    this.uploadedUrl.set(r.pieceJointeUrl || null);
    this.selectedFile.set(null);
    this.slideError.set(null);
    this.slideOpen.set(true);
  }

  closeSlide(): void { this.slideOpen.set(false); this.slideError.set(null); }

  onFileChange(event: Event | DragEvent): void {
    let file: File | null = null;
    if (event instanceof DragEvent) {
      event.preventDefault();
      file = event.dataTransfer?.files?.[0] ?? null;
    } else {
      const input = event.target as HTMLInputElement;
      file = input.files?.[0] ?? null;
    }
    if (file) this.selectedFile.set(file);
  }

  uploadFile(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.uploading.set(true);
    this.recSvc.uploadDocument(file).subscribe({
      next: res => { this.uploadedUrl.set(res.url); this.uploading.set(false); this.ui.success('Document uploadé ✅'); },
      error: ()  => { this.uploading.set(false); this.ui.error('Erreur upload.'); }
    });
  }

  removeFile(): void { this.uploadedUrl.set(null); this.selectedFile.set(null); }

  save(): void {
    if (this.form.invalid) { this.slideError.set('Remplissez tous les champs obligatoires.'); return; }
    const user = this.currentUser();
    if (!user) { this.slideError.set('Utilisateur non identifié.'); return; }
    this.loading.set(true);
    const statut = this.statuts().find(s => s.code === 'EN_ATTENTE');
    const req: ReclamationRequest = {
      utilisateurId:        user.id,
      serviceReclamationId: +this.form.value.serviceReclamationId,
      statutReclamationId:  statut?.id ?? 1,
      sujet:                this.form.value.sujet,
      description:          this.form.value.description,
      pieceJointeUrl:       this.uploadedUrl() ?? undefined,
    };
    const id  = this.editingId();
    const obs = id ? this.recSvc.update(id, req) : this.recSvc.create(req);
    obs.subscribe({
      next: () => {
        this.slideOpen.set(false);
        this.ui.success(id ? 'Réclamation modifiée.' : 'Réclamation soumise ✅');
        this.loadUserAndData();
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.slideError.set(this.errorSvc.parse(err).message);
        this.loading.set(false);
      }
    });
  }

  delete(r: Reclamation): void {
    if (!this.peutModifier(r)) { this.ui.warning('Impossible de supprimer dans cet état.'); return; }
    this.ui.confirm({
      title: 'Supprimer', message: `Supprimer "${r.sujet}" ?`,
      type: 'danger', confirmLabel: 'Supprimer',
      onConfirm: () => {
        this.recSvc.delete(r.id).subscribe({
          next: () => { this.ui.success('Supprimée.'); this.loadUserAndData(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  voirDetail(r: Reclamation): void { this.detailRec.set(r); }
  fermerDetail(): void { this.detailRec.set(null); this.newComment.set(''); }

  envoyerCommentaire(): void {
    const rec  = this.detailRec();
    const user = this.currentUser();
    const txt  = this.newComment().trim();
    if (!rec || !txt) return;
    this.savingComment.set(true);
    const nom = `${user?.prenom || ''} ${user?.nom || ''}`.trim();
    this.recSvc.ajouterCommentaire(rec.id, txt, nom, false).subscribe({
      next: updated => {
        this.detailRec.set(this.enrichirRec(updated));
        this.reclamations.update(rs => rs.map(r => r.id === updated.id ? this.enrichirRec(updated) : r));
        this.newComment.set('');
        this.savingComment.set(false);
      },
      error: () => { this.ui.error('Erreur.'); this.savingComment.set(false); }
    });
  }

  private enrichirRec(r: Reclamation): Reclamation {
    return {
      ...r,
      serviceNom: this.services().find(s => s.id === r.serviceReclamationId)?.libelle || '—',
      statutNom:  this.statuts().find(s => s.id === r.statutReclamationId)?.libelle || '—',
      statutCode: this.statuts().find(s => s.id === r.statutReclamationId)?.code || ''
    };
  }

  peutModifier(r: Reclamation): boolean {
    const code = r.statutCode || this.statuts().find(s => s.id === r.statutReclamationId)?.code || '';
    return code === 'EN_ATTENTE';
  }

  getBadgeClass(code?: string): string {
    switch (code) {
      case 'EN_ATTENTE': return 'dt-badge dt-badge-pending';
      case 'EN_COURS':   return 'dt-badge dt-badge-accent';
      case 'RESOLUE':    return 'dt-badge dt-badge-delivered';
      case 'REJETEE':    return 'dt-badge dt-badge-canceled';
      case 'FERMEE':     return 'dt-badge dt-badge-default';
      default:           return 'dt-badge dt-badge-default';
    }
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

  isImage(url?: string): boolean {
    return !!(url && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url));
  }

  getInitiales(nom?: string): string {
    if (!nom) return '?';
    const p = nom.trim().split(' ');
    return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : nom.substring(0,2).toUpperCase();
  }

  getAvatarColor(nom: string): string {
    const c = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6'];
    return c[(nom||'').charCodeAt(0) % c.length];
  }

  resetFilters(): void {
    this.filterStatutId.set(null);
    this.filterServiceId.set(null);
    this.searchText.set('');
    this.page.set(1);
  }

  goPage(p: number): void { this.page.set(Math.max(1, Math.min(p, this.totalPages()))); }
  minVal(a: number, b: number): number { return Math.min(a, b); }
}