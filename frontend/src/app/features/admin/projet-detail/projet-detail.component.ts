// projet-detail.component.ts — COMPLET FINAL
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ProjetService }          from '../../../services/projet.service';
import { ActiviteService }        from '../../../services/activite.service';
import { CommentaireService }     from '../../../services/commentaire.service';
import { StatutActiviteService }  from '../../../services/statutactivite.service';
import { GroupeService }          from '../../../services/groupe.service';
import { KeycloakService }        from '../../../services/keycloak.service';
import { UserService }            from '../../../services/user.service';
import { UiService }              from '../../../services/ui.service';

import { Projet }              from '../../../shared/models/projet.model';
import { Activite, ActiviteRequest } from '../../../shared/models/activite.model';
import { Commentaire }         from '../../../shared/models/commentaire.model';
import { StatutActivite }      from '../../../shared/models/statut-activite.model';
import { Groupe }              from '../../../shared/models/groupe.model';
import { HttpErrorResponse }   from '@angular/common/http';

@Component({
  selector: 'app-projet-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './projet-detail.component.html',
  styleUrls: ['./projet-detail.component.css']
})
export class ProjetDetailComponent implements OnInit {

  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private projetSvc    = inject(ProjetService);
  private activiteSvc  = inject(ActiviteService);
  private commentSvc   = inject(CommentaireService);
  private nomencSvc    = inject(StatutActiviteService);
  private groupeSvc    = inject(GroupeService);
  private keycloak     = inject(KeycloakService);
  private userSvc      = inject(UserService);
  private ui           = inject(UiService);

  // ── Données ──
  projet          = signal<Projet | null>(null);
  activites       = signal<Activite[]>([]);
  commentaires    = signal<Commentaire[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);
  tousGroupes     = signal<Groupe[]>([]);

  // ── UI ──
  loading              = signal(true);
  loadingComments      = signal(false);
  showCreateActivite   = signal(false);
  submittingActivite   = signal(false);
  submittingComment    = signal(false);

  // ── Commentaires ──
  nouveauCommentaire = signal('');
  groupeIdComment    = signal<number | null>(null);
  editingCommentId   = signal<number | null>(null);
  editContenu        = signal('');

  // ── Création activité inline ──
  newActiviteForm = signal<ActiviteRequest>({
    nom: '', description: '', couleur: '#10b981',
    statutActiviteId: 1, priorite: 2,
    estGlobale: false, visible: true, facturable: true
  });

  // ── Utilisateur connecté ──
  currentUserKcId  = '';
  currentUserNom   = '';
  currentUserPhoto = '';

  // ── Constantes ──
  readonly COULEURS_ACTIVITE = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#10b981','#06b6d4','#3b82f6','#64748b'];
  readonly PRIORITES = [
    { value: 1, label: 'Basse',   couleur: '#10b981' },
    { value: 2, label: 'Normale', couleur: '#3b82f6' },
    { value: 3, label: 'Haute',   couleur: '#f97316' },
    { value: 4, label: 'Urgente', couleur: '#ef4444' }
  ];
  private readonly STATUT_CODE_MAP: Record<string, string> = {
    'A_FAIRE':  'dt-status-a-faire', 'EN_COURS': 'dt-status-en-cours',
    'EN_REVUE': 'dt-status-en-revue', 'TERMINE':  'dt-status-termine',
    'BLOQUE':   'dt-status-bloque',  'ANNULE':   'dt-status-annule',
  };

  // ── Computed ──
  statsActivites = computed(() => {
    const list = this.activites();
    return {
      total:     list.length,
      terminees: list.filter(a => this.getStatutCode(a.statutActiviteId) === 'TERMINE').length,
      enCours:   list.filter(a => this.getStatutCode(a.statutActiviteId) === 'EN_COURS').length,
      bloquees:  list.filter(a => this.getStatutCode(a.statutActiviteId) === 'BLOQUE').length,
    };
  });

  // ── Lifecycle ──
  ngOnInit(): void {
    this.currentUserKcId  = this.keycloak.getKeycloakUserId() || '';
    this.currentUserNom   = this.keycloak.getFullName() || '';

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.router.navigate(['/projets']); return; }

    // Charger les données
    this.projetSvc.getById(id).subscribe({
      next: p => {
        this.projet.set(p);
        this.loading.set(false);
        this.loadActivites(id);
        this.loadCommentaires(id);
        // Réinitialiser le formulaire avec le premier statut
        this.nomencSvc.getStatutsActivite().subscribe({
          next: s => {
            this.statutsActivite.set(s);
            if (s.length > 0) {
              this.newActiviteForm.set({ ...this.newActiviteForm(), statutActiviteId: s[0].id });
            }
          }
        });
      },
      error: () => { this.ui.error('Projet non trouvé.'); this.router.navigate(['/projets']); }
    });

    this.groupeSvc.getAll().subscribe({ next: g => this.tousGroupes.set(g) });
  }

  // ── Chargement ──
  loadActivites(projetId: number): void {
    this.activiteSvc.getByProjet(projetId).subscribe({ next: a => this.activites.set(a), error: () => {} });
  }

  loadCommentaires(projetId: number): void {
    this.loadingComments.set(true);
    this.commentSvc.getByProjet(projetId).subscribe({
      next: c => { this.commentaires.set(c); this.loadingComments.set(false); },
      error: () => this.loadingComments.set(false)
    });
  }

  // ── Création activité inline ──
  createActiviteForProjet(): void {
    const f = this.newActiviteForm();
    if (!f.nom?.trim()) { this.ui.error('Le nom est obligatoire.'); return; }
    const p = this.projet();
    if (!p) return;
    this.submittingActivite.set(true);

    this.activiteSvc.create(f).subscribe({
      next: (newActivite) => {
        // Assigner la nouvelle activité à ce projet
        const currentIds = this.activites().map(a => a.id);
        this.projetSvc.assignerActivites(p.id, [...currentIds, newActivite.id]).subscribe({
          next: () => {
            this.ui.success('Activité créée et assignée au projet.');
            this.showCreateActivite.set(false);
            this.submittingActivite.set(false);
            // Reset form
            this.newActiviteForm.set({
              nom: '', description: '', couleur: '#10b981',
              statutActiviteId: this.statutsActivite()[0]?.id || 1,
              priorite: 2, estGlobale: false, visible: true, facturable: true
            });
            this.loadActivites(p.id);
          },
          error: () => { this.ui.error('Activité créée mais erreur d\'assignation.'); this.submittingActivite.set(false); this.loadActivites(p.id); }
        });
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error('Erreur création activité.');
        this.submittingActivite.set(false);
      }
    });
  }

  cancelCreateActivite(): void {
    this.showCreateActivite.set(false);
    const s = this.statutsActivite();
    this.newActiviteForm.set({
      nom: '', description: '', couleur: '#10b981',
      statutActiviteId: s[0]?.id || 1,
      priorite: 2, estGlobale: false, visible: true, facturable: true
    });
  }

  // ── Commentaires ──
  submitComment(): void {
    const contenu = this.nouveauCommentaire().trim();
    if (!contenu) return;
    const p = this.projet();
    if (!p) return;
    this.submittingComment.set(true);
    this.commentSvc.createForProjet(p.id, {
      contenu,
      auteurNom:     this.currentUserNom,
      auteurPhotoUrl: this.currentUserPhoto || undefined,
      groupeId:      this.groupeIdComment() || undefined
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
      next: updated => { this.commentaires.update(list => list.map(x => x.id === c.id ? updated : x)); this.editingCommentId.set(null); },
      error: () => this.ui.error('Erreur modification.')
    });
  }

  deleteComment(c: Commentaire): void {
    this.ui.confirm({
      title: 'Supprimer le commentaire', message: 'Supprimer ce commentaire ?',
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

  // ── Helpers statut ──
  getStatutCode(id?: number): string { return this.statutsActivite().find(s => s.id === id)?.code || ''; }
  getStatutLibelle(id?: number): string { return this.statutsActivite().find(s => s.id === id)?.libelle || '—'; }
  getStatutBadgeClass(id?: number): string {
    const code = this.getStatutCode(id);
    return this.STATUT_CODE_MAP[code] ? `dt-badge ${this.STATUT_CODE_MAP[code]}` : 'dt-badge dt-badge-default';
  }

  getPriorite(value: number) { return this.PRIORITES.find(p => p.value === value); }

  getProgressPct(p?: number, e?: number): number {
    if (!e) return 0;
    return Math.min(100, Math.round(((p || 0) / e) * 100));
  }
  getProgressColor(p?: number, e?: number): string {
    const pct = this.getProgressPct(p, e);
    return pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
  }

  getStatutProjetColor(s: string): string {
    return ({ PLANIFIE: '#6366f1', EN_COURS: '#10b981', SUSPENDU: '#f97316', TERMINE: '#64748b', ANNULE: '#ef4444' } as any)[s] || '#94a3b8';
  }
  getStatutProjetLabel(s: string): string {
    return ({ PLANIFIE: 'Planifié', EN_COURS: 'En cours', SUSPENDU: 'Suspendu', TERMINE: 'Terminé', ANNULE: 'Annulé' } as any)[s] || s;
  }
  getAvancementColor(pct: number): string {
    if (pct >= 100) return '#10b981'; if (pct >= 60) return '#3b82f6'; if (pct >= 30) return '#f97316'; return '#94a3b8';
  }

  getAvatarColor(name: string): string {
    const colors = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#10b981','#06b6d4','#3b82f6'];
    return colors[(name || '').charCodeAt(0) % colors.length];
  }
  getInitiales(nom: string): string { return (nom || '').split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase()).join(''); }

  fmtDate(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]}, ${dt.getFullYear()}`;
  }
  fmtDateTime(d?: string): string {
    if (!d) return '—';
    const dt = new Date(d);
    const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]} ${dt.getFullYear()} à ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
  }

  goBack(): void { this.router.navigate(['/projets']); }
}