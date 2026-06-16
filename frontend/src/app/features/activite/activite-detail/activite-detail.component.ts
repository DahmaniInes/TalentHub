// activite-detail.component.ts — COMPLET — priorite → prioriteId
import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ActiviteService }          from '../../../services/activite.service';
import { CommentaireService }       from '../../../services/commentaire.service';
import { StatutActiviteService }    from '../../../services/statutactivite.service';
import { KeycloakService }          from '../../../services/keycloak.service';
import { UiService }                from '../../../services/ui.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { NotificationService }      from '../../../services/notification.service';
// ← AJOUT
import { PrioriteActiviteService }  from '../../../services/priorite-activite.service';
import { PrioriteActivite }         from '../../../shared/models/priorite-activite.model';

import { Activite }       from '../../../shared/models/activite.model';
import { Commentaire }    from '../../../shared/models/commentaire.model';
import { StatutActivite } from '../../../shared/models/statut-activite.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-activite-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './activite-detail.component.html',
  styleUrls: ['./activite-detail.component.css']
})
export class ActiviteDetailComponent implements OnInit, OnDestroy {

  private route         = inject(ActivatedRoute);
  private router        = inject(Router);
  private activiteSvc   = inject(ActiviteService);
  private commentSvc    = inject(CommentaireService);
  private nomencSvc     = inject(StatutActiviteService);
  private keycloak      = inject(KeycloakService);
  private ui            = inject(UiService);
  // ← AJOUT
  private prioriteSvc   = inject(PrioriteActiviteService);
  readonly perms        = inject(PermissionContextService);
  private notifSvc      = inject(NotificationService);
  private subs          = new Subscription();

  activite        = signal<Activite | null>(null);
  commentaires    = signal<Commentaire[]>([]);
  statuts         = signal<StatutActivite[]>([]);
  // ← AJOUT : signal dynamique (remplace PRIORITES statique)
  priorites       = signal<PrioriteActivite[]>([]);
  loading         = signal(true);
  loadingComments = signal(false);

  nouveauCommentaire = signal('');
  groupeIdComment    = signal<number | null>(null);
  submittingComment  = signal(false);
  editingCommentId   = signal<number | null>(null);
  editContenu        = signal('');

  currentUserKcId = '';
  currentUserNom  = '';

  // ← SUPPRIMÉ : readonly PRIORITES = [...] — remplacé par priorites signal

  ngOnInit(): void {
    this.currentUserKcId = this.keycloak.getKeycloakUserId() || '';
    this.currentUserNom  = this.keycloak.getFullName() || '';

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/activites']); return; }

    this.activiteSvc.getById(id).subscribe({
      next: a => {
        this.activite.set(a);
        this.loading.set(false);
        this.loadCommentaires(id);
      },
      error: () => { this.ui.error('Activité non trouvée.'); this.router.navigate(['/activites']); }
    });

    this.nomencSvc.getStatutsActivite().subscribe({ next: s => this.statuts.set(s) });

    // ← AJOUT : charger les priorités depuis la nomenclature
    this.prioriteSvc.getActives().subscribe({ next: p => this.priorites.set(p) });

    // Temps réel
    this.subs.add(this.notifSvc.newNotification$.subscribe(n => {
      const t   = String(n.type);
      const aId = this.activite()?.id;
      if (aId && t === 'ACTIVITE_COMMENTAIRE' && n.ressourceId === aId) {
        this.loadCommentaires(aId);
      }
    }));
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  loadCommentaires(activiteId: number): void {
    this.loadingComments.set(true);
    this.commentSvc.getByActivite(activiteId).subscribe({
      next: c => { this.commentaires.set(c); this.loadingComments.set(false); },
      error: () => this.loadingComments.set(false)
    });
  }

  submitComment(): void {
    if (!this.perms.canCommentAnyProject() && !this.perms.canEditAnyActivity()) {
      this.ui.warning('Vous n\'avez pas la permission de commenter.');
      return;
    }
    const contenu = this.nouveauCommentaire().trim();
    if (!contenu) return;
    const a = this.activite();
    if (!a) return;
    this.submittingComment.set(true);
    this.commentSvc.createForActivite(a.id, {
      contenu,
      auteurNom: this.currentUserNom,
      groupeId:  this.groupeIdComment() || undefined
    }).subscribe({
      next: c => {
        this.commentaires.update(list => [c, ...list]);
        this.nouveauCommentaire.set('');
        this.groupeIdComment.set(null);
        this.submittingComment.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error(err.error?.message || 'Erreur envoi commentaire.');
        this.submittingComment.set(false);
      }
    });
  }

  startEdit(c: Commentaire): void { this.editingCommentId.set(c.id); this.editContenu.set(c.contenu); }

  saveEdit(c: Commentaire): void {
    const contenu = this.editContenu().trim();
    if (!contenu) return;
    this.commentSvc.update(c.id, contenu).subscribe({
      next: updated => {
        this.commentaires.update(list => list.map(x => x.id === c.id ? updated : x));
        this.editingCommentId.set(null);
      },
      error: () => this.ui.error('Erreur modification.')
    });
  }

  deleteComment(c: Commentaire): void {
    this.ui.confirm({
      title: 'Supprimer', message: 'Supprimer ce commentaire ?',
      type: 'danger', confirmLabel: 'Supprimer',
      onConfirm: () => {
        this.commentSvc.delete(c.id).subscribe({
          next: () => this.commentaires.update(list => list.filter(x => x.id !== c.id)),
          error: () => this.ui.error('Erreur suppression.')
        });
      }
    });
  }

  isOwn(c: Commentaire): boolean { return c.auteurKeycloakId === this.currentUserKcId; }

  // ── Helpers ──
  getStatutLibelle(id?: number): string { return this.statuts().find(s => s.id === id)?.libelle || '—'; }
  getStatutCode(id?: number): string    { return this.statuts().find(s => s.id === id)?.code || ''; }

  getStatutBadgeClass(id?: number): string {
    const code = this.getStatutCode(id);
    const map: Record<string, string> = {
      'A_FAIRE':  'dt-badge dt-status-a-faire',
      'EN_COURS': 'dt-badge dt-status-en-cours',
      'EN_REVUE': 'dt-badge dt-status-en-revue',
      'TERMINE':  'dt-badge dt-status-termine',
      'BLOQUE':   'dt-badge dt-status-bloque',
      'ANNULE':   'dt-badge dt-status-annule'
    };
    return map[code] || 'dt-badge dt-badge-default';
  }

  // ← MODIFIÉ : cherche dans le signal dynamique par id
  getPriorite(id?: number): PrioriteActivite | undefined {
    if (!id) return undefined;
    return this.priorites().find(p => p.id === id);
  }

  getProgressPct(p?: number, e?: number): number {
    if (!e) return 0;
    return Math.min(100, Math.round(((p || 0) / e) * 100));
  }
  getProgressColor(p?: number, e?: number): string {
    const pct = this.getProgressPct(p, e);
    return pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
  }

  getAvatarColor(name: string): string {
    const c = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#10b981','#06b6d4','#3b82f6'];
    return c[(name || '').charCodeAt(0) % c.length];
  }
  getInitiales(n: string): string {
    return (n || '').split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  }
  fmtDate(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const m  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]}, ${dt.getFullYear()}`;
  }
  fmtDateTime(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const m  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]} ${dt.getFullYear()} à ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
  }

  goBack(): void { this.router.navigate(['/activites']); }

  fmtHeures(h: number): string {
    if (!h || h <= 0) return '0h';
    const heures  = Math.floor(h);
    const minutes = Math.round((h - heures) * 60);
    return minutes > 0 ? `${heures}h${String(minutes).padStart(2,'0')}` : `${heures}h`;
  }
}