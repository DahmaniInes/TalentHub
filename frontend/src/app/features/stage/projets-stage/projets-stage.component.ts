import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ProjetStageService }       from '../../../services/projet-stage-service.service';
import { StagiaireService }         from '../../../services/stagiaire.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { KeycloakService }          from '../../../services/keycloak.service';
import { UserService }              from '../../../services/user.service';
import { UiService }                from '../../../services/ui.service';
import { ProjetService }            from '../../../services/projet.service';
import { DocumentService }          from '../../../services/document.service';
import { Projet, ProjetRequest, StatutProjet } from '../../../shared/models/projet.model';
import { Utilisateur }              from '../../../shared/models/utilisateur.model';
import { HttpErrorResponse }        from '@angular/common/http';
import { StagiaireContextService } from '../../../services/stagiaire-context.service';

// ✅ ID fixe du type de projet "STAGE_ACADEMIQUE" dans la nomenclature (confirmé en dur)
const TYPE_PROJET_STAGE_ID = 4;

// ✅ Forme minimale renvoyée par GET /projets/{id}/superviseurs-stagiaires
interface SuperviseurInfo {
  id: number;
  nomComplet: string;
  email: string;
  photoUrl?: string;
  poste?: string;
}

@Component({
  selector: 'app-projets-stage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projets-stage.component.html'
})
export class ProjetsStageComponent implements OnInit {
  private stagCtx = inject(StagiaireContextService);
  private svc       = inject(ProjetStageService);
  private projetSvc = inject(ProjetService);
  private stagSvc   = inject(StagiaireService);
  private userSvc   = inject(UserService);
  private docSvc    = inject(DocumentService);
  private keycloak  = inject(KeycloakService);
  readonly perms    = inject(PermissionContextService);
  readonly ui       = inject(UiService);
  private router    = inject(Router);
  // ✅ Appel direct pour GET /projets/{id}/superviseurs-stagiaires — même
  // endpoint déjà utilisé dans la page détail projet, réutilisé ici en
  // batch (un appel par projet visible, en parallèle via forkJoin) pour
  // afficher la colonne Superviseurs dans la liste sans modifier le backend.
  private http      = inject(HttpClient);

  projets       = signal<Projet[]>([]);
  stagiaires    = signal<Utilisateur[]>([]);
  statutsProjet = signal<StatutProjet[]>([]);
  loading       = signal(false);
  saving        = signal(false);
  uploadingDoc  = signal(false);

  currentUserId = signal<number | null>(null);

  search       = signal('');
  filterStatut = signal<number | ''>('');
  filterOpen   = signal(false);
  slideOpen    = signal(false);
  editingId    = signal<number | null>(null);
  selectedIds  = signal<Set<number>>(new Set());

  // ✅ Documents à uploader juste après la création du projet (upload immédiat)
  pendingFiles  = signal<File[]>([]);

  // ✅ Map projetId → liste de superviseurs distincts de tous les stagiaires
  // de ce projet, pour la colonne "Superviseurs" du tableau.
  superviseursParProjetId = signal<Map<number, SuperviseurInfo[]>>(new Map());

  // ── PAGINATION (style identique à GroupsComponent : pageSize modifiable, ellipses) ──
  currentPage = signal(1);
  pageSize    = signal(10);

  resetPage(): void { this.currentPage.set(1); }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.currentPage.set(p);
  }

  minVal(a: number, b: number): number { return Math.min(a, b); }

  // ✅ Snapshot des stagiaires déjà assignés au moment de l'ouverture du formulaire
  //    (nécessaire pour calculer qui ajouter / qui retirer lors de save() en édition)
  private stagiaireIdsOriginaux: number[] = [];

  form = signal<any>({
    nom: '', description: '', dateDebut: '', dateFin: '',
    statutProjetId: undefined, typeProjetId: TYPE_PROJET_STAGE_ID, avancement: 0,
    stagiaireIds: []
  });

  filtered = computed(() => {
    // ✅ On ne garde QUE les projets de type STAGE_ACADEMIQUE (filtre frontend en attendant le backend)
    let list = this.projets().filter(p => p.typeProjetId === TYPE_PROJET_STAGE_ID);
    const q = this.search().toLowerCase();
    if (q) list = list.filter(p => p.nom.toLowerCase().includes(q));
    if (this.filterStatut())
      list = list.filter(p => p.statutProjetId === +this.filterStatut());
    return list;
  });

  // ── PAGINATION (computed) ──
  totalPages = computed(() =>
      Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));

  /** Toutes les pages — le template filtre lui-même via les ellipses (style GroupsComponent) */
  pagesArray = computed(() =>
      Array.from({ length: this.totalPages() }, (_, i) => i + 1));

  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  statsEnCours = computed(() => this.filtered().filter(p => {
    const s = this.statutsProjet().find(st => st.id === p.statutProjetId);
    return s?.code === 'EN_COURS';
  }).length);
  statsTermines = computed(() => this.filtered().filter(p => {
    const s = this.statutsProjet().find(st => st.id === p.statutProjetId);
    return s?.code === 'TERMINE';
  }).length);

  allPageSelected  = computed(() =>
      this.paged().length > 0 &&
      this.paged().every(p => this.selectedIds().has(p.id)));
  somePageSelected = computed(() =>
      this.paged().some(p => this.selectedIds().has(p.id)) &&
      !this.allPageSelected());

  ngOnInit(): void {
    if (!this.perms.canSeeProjetsStageMenu()) return;

    // Charger statuts
    this.projetSvc.getStatutsProjet().subscribe({
      next: d => this.statutsProjet.set(d)
    });

    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => {
          this.currentUserId.set(u.id);
          this.loadProjets(u.id);
          // ✅ GET /stagiaires (liste admin complète) n'est accessible qu'avec
          // INT_ADMIN_VIEW_ALL_INTERNS — un superviseur ou un stagiaire reçoit
          // un 403 sinon. Cette liste ne sert qu'au select multi-stagiaires
          // du formulaire de création/édition, visible uniquement pour l'admin.
          if (this.perms.canViewAllInterns()) {
            this.stagSvc.getAll().subscribe({ next: d => this.stagiaires.set(d) });
          }
        }
      });
    }
  }

  private loadProjets(userId: number): void {
    this.loading.set(true);
    if (this.perms.canViewAllProjetsStage()) {
      this.svc.getAll().subscribe({
        next: d => { this.projets.set(d); this.loading.set(false); this.chargerSuperviseursPourTousLesProjets(d); },
        error: () => this.loading.set(false)
      });



    } else if (this.perms.canViewMyProjetsStage()) {
      this.svc.getBySuperviseur(userId).subscribe({
        next: d => { this.projets.set(d); this.loading.set(false); this.chargerSuperviseursPourTousLesProjets(d); },
        error: () => this.loading.set(false)
      });


  } else if (this.perms.canViewMyProjet()) {
  this.svc.getByStagiaire(userId).subscribe({
    next: d => {
      const projetsStage = d.filter(p => p.typeProjetId === TYPE_PROJET_STAGE_ID);
      
      // ✅ Un seul projet → stocker dans le contexte + rediriger directement
      if (projetsStage.length === 1) {
        this.stagCtx.projetId.set(projetsStage[0].id);
        this.stagCtx.projetNom.set(projetsStage[0].nom);
        this.router.navigate(['/projets-stage', projetsStage[0].id], { replaceUrl: true });
        return;
      }

      this.projets.set(d);
      this.loading.set(false);
      this.chargerSuperviseursPourTousLesProjets(d);
    },
    error: () => this.loading.set(false)
  });


    } else {
      this.projets.set([]);
      this.loading.set(false);
    }
  }

  /**
   * ✅ NOUVEAU — Charge les superviseurs de tous les stagiaires, pour tous
   * les projets visibles, en parallèle (un appel HTTP par projet, tous
   * lancés ensemble via forkJoin — pas de chaîne séquentielle). Réutilise
   * l'endpoint GET /projets/{id}/superviseurs-stagiaires déjà existant et
   * déjà utilisé dans la page détail projet ; aucune modification backend.
   * Un échec sur un projet isolé n'empêche pas les autres de s'afficher
   * (catchError → tableau vide pour ce projet).
   */
  private chargerSuperviseursPourTousLesProjets(projets: Projet[]): void {
    const idsAvecStagiaires = projets.filter(p => (p.stagiaires?.length || 0) > 0);
    if (idsAvecStagiaires.length === 0) return;

    const appels = idsAvecStagiaires.map(p =>
        this.http.get<{ stagiaireId: number; superviseurs: SuperviseurInfo[] }[]>(
            `http://localhost:8085/api/application/projets/${p.id}/superviseurs-stagiaires`
        ).pipe(catchError(() => of([])))
    );

    forkJoin(appels).subscribe(resultats => {
      const map = new Map<number, SuperviseurInfo[]>();
      resultats.forEach((rows, idx) => {
        const projetId = idsAvecStagiaires[idx].id;
        const seen = new Set<number>();
        const distincts: SuperviseurInfo[] = [];
        rows.forEach(r => (r.superviseurs || []).forEach(sup => {
          if (!seen.has(sup.id)) { seen.add(sup.id); distincts.push(sup); }
        }));
        map.set(projetId, distincts);
      });
      this.superviseursParProjetId.set(map);
    });
  }

  /** Superviseurs distincts (tous stagiaires confondus) d'un projet — pour la colonne Superviseurs */
  getSuperviseursProjet(projetId: number): SuperviseurInfo[] {
    return this.superviseursParProjetId().get(projetId) || [];
  }

  // ── Sélection (sur la page courante uniquement) ──
  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  toggleSelect(id: number): void {
    this.selectedIds.update(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  toggleSelectAll(): void {
    if (this.allPageSelected()) {
      this.selectedIds.update(s => {
        const n = new Set(s);
        this.paged().forEach(p => n.delete(p.id));
        return n;
      });
    } else {
      this.selectedIds.update(s => {
        const n = new Set(s);
        this.paged().forEach(p => n.add(p.id));
        return n;
      });
    }
  }
  clearSelection(): void { this.selectedIds.set(new Set()); }

  openCreate(): void {
    this.editingId.set(null);
    const enCoursId = this.statutsProjet().find(s => s.code === 'EN_COURS')?.id;
    this.form.set({
      nom: '', description: '', dateDebut: '', dateFin: '',
      // ✅ typeProjetId forcé à STAGE_ACADEMIQUE — non modifiable par l'utilisateur
      statutProjetId: enCoursId, typeProjetId: TYPE_PROJET_STAGE_ID,
      avancement: 0, stagiaireIds: []
    });
    this.stagiaireIdsOriginaux = [];
    this.pendingFiles.set([]);
    this.slideOpen.set(true);
  }

  openEdit(p: Projet, e?: Event): void {
    e?.stopPropagation();
    this.editingId.set(p.id);
    const stagiaireIdsActuels = p.stagiaires?.map(s => s.id) || [];
    this.form.set({
      nom:            p.nom,
      description:    p.description || '',
      dateDebut:      p.dateDebut   || '',
      dateFin:        p.dateFin     || '',
      statutProjetId: p.statutProjetId,
      // ✅ Toujours STAGE_ACADEMIQUE même en édition
      typeProjetId:   TYPE_PROJET_STAGE_ID,
      avancement:     p.avancement,
      stagiaireIds:   stagiaireIdsActuels
    });
    // ✅ On garde une copie de l'état initial pour calculer le diff (ajouts/retraits) dans save()
    this.stagiaireIdsOriginaux = [...stagiaireIdsActuels];
    this.pendingFiles.set([]);
    this.slideOpen.set(true);
  }

  openDetail(p: Projet): void {
    this.router.navigate(['/projets-stage', p.id]);
  }

  closeSlide(): void { this.slideOpen.set(false); }

  toggleStagiaire(id: number): void {
    const ids: number[] = this.form().stagiaireIds || [];
    this.form.update(f => ({
      ...f,
      stagiaireIds: ids.includes(id)
          ? ids.filter((x: number) => x !== id)
          : [...ids, id]
    }));
  }
  isStagiaireSelected(id: number): boolean {
    return (this.form().stagiaireIds || []).includes(id);
  }

  // ── Documents (sélection avant création, upload juste après) ──
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.pendingFiles.update(list => [...list, ...Array.from(input.files!)]);
    input.value = '';
  }

  removePendingFile(index: number): void {
    this.pendingFiles.update(list => list.filter((_, i) => i !== index));
  }

  private uploaderDocumentsEnAttente(projetId: number): void {
    const files = this.pendingFiles();
    if (!files.length) return;
    this.uploadingDoc.set(true);
    let remaining = files.length;
    files.forEach(file => {
      this.docSvc.upload({ file, projetId }).subscribe({
        next: () => { remaining--; if (remaining === 0) this.uploadingDoc.set(false); },
        error: () => {
          remaining--;
          if (remaining === 0) this.uploadingDoc.set(false);
          this.ui.error(`Échec de l'upload du fichier "${file.name}".`);
        }
      });
    });
  }

  /**
   * Synchronise les stagiaires assignés : ajoute les nouveaux, retire ceux décochés.
   * Appelle onDone() une fois TOUTES les opérations terminées (succès ou échec),
   * pour permettre de recharger le projet avec sa liste de stagiaires à jour.
   */
  private synchroniserStagiaires(projetId: number, onDone: () => void): void {
    const idsSelectionnes: number[] = this.form().stagiaireIds || [];
    const idsOriginaux: number[]    = this.stagiaireIdsOriginaux || [];

    const aAjouter = idsSelectionnes.filter(id => !idsOriginaux.includes(id));
    const aRetirer = idsOriginaux.filter(id => !idsSelectionnes.includes(id));

    if (aAjouter.length === 0 && aRetirer.length === 0) { onDone(); return; }

    const appels = [
      ...aAjouter.map(stagId => this.svc.assignerAStagiaire(projetId, stagId)),
      ...aRetirer.map(stagId => this.svc.retirerStagiaire(projetId, stagId))
    ];

    forkJoin(appels).subscribe({
      next: () => onDone(),
      error: () => { this.ui.error('Erreur lors de la mise à jour des stagiaires.'); onDone(); }
    });
  }

  save(): void {
    if (!this.form().nom?.trim()) {
      this.ui.warning('Le nom est obligatoire.');
      return;
    }
    this.saving.set(true);
    const body: ProjetRequest = {
      nom:            this.form().nom,
      description:    this.form().description,
      dateDebut:      this.form().dateDebut || undefined,
      dateFin:        this.form().dateFin   || undefined,
      statutProjetId: this.form().statutProjetId,
      // ✅ Toujours envoyé en dur, jamais depuis un select utilisateur
      typeProjetId:   TYPE_PROJET_STAGE_ID,
      avancement:     this.form().avancement,
      visible:        true,
      facturable:     true,
      autoriserActivitesGlobales: false
    };

    const obs = this.editingId()
        ? this.svc.update(this.editingId()!, body)
        : this.svc.create(body);

    obs.subscribe({
      next: saved => {
        // ✅ Synchronise les stagiaires (ajout + retrait), que ce soit création ou édition.
        // Une fois fait, on recharge le projet pour avoir la liste de stagiaires à jour
        // (sinon `saved` retourné par create()/update() contient encore l'ancienne liste).
        this.synchroniserStagiaires(saved.id, () => {
          this.svc.getById(saved.id).subscribe({
            next: projetAJour => {
              this.projets.update(list =>
                  this.editingId()
                      ? list.map(p => p.id === projetAJour.id ? projetAJour : p)
                      : [...list, projetAJour]
              );
              this.chargerSuperviseursPourTousLesProjets(this.projets());
            },
            error: () => {
              // En cas d'échec du rechargement, on retombe au moins sur `saved`
              this.projets.update(list =>
                  this.editingId()
                      ? list.map(p => p.id === saved.id ? saved : p)
                      : [...list, saved]
              );
            }
          });
        });

        // ✅ Upload immédiat des documents sélectionnés, avant de fermer le slide-over
        this.uploaderDocumentsEnAttente(saved.id);

        this.slideOpen.set(false);
        this.saving.set(false);
        this.pendingFiles.set([]);
        this.ui.success(this.editingId() ? 'Projet mis à jour ✅' : 'Projet créé ✅');
      },
      error: () => {
        this.saving.set(false);
        this.ui.error('Erreur lors de la sauvegarde.');
      }
    });
  }

  delete(p: Projet, e?: Event): void {
    e?.stopPropagation();
    this.ui.confirm({
      title: 'Supprimer',
      message: `Supprimer "${p.nom}" ?`,
      confirmLabel: 'Supprimer',
      type: 'danger',
      onConfirm: () => this.svc.delete(p.id).subscribe({
        next: () => {
          this.projets.update(l => l.filter(x => x.id !== p.id));
          this.ui.success('Supprimé.');
        }
      })
    });
  }

  getStatutLabel(statutProjetId?: number): string {
    const s = this.statutsProjet().find(st => st.id === statutProjetId);
    return s?.libelle || '—';
  }

  getStatutColor(statutProjetId?: number): string {
    const s = this.statutsProjet().find(st => st.id === statutProjetId);
    return s?.couleur || '#94a3b8';
  }

  avancementColor(v: number): string {
    if (v >= 80) return '#10b981';
    if (v >= 40) return '#f59e0b';
    return '#6366f1';
  }

  fmtDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  formatSize(bytes?: number): string { return this.docSvc.formatSize(bytes); }

  canEdit():   boolean { return this.perms.canEditProjetStage() || this.perms.canManageProjetStage(); }
  canDelete(): boolean { return this.perms.canDeleteProjetStage(); }
  canCreate(): boolean { return this.perms.canCreateProjetStage() || this.perms.canManageProjetStage(); }

  getInitiales(nom?: string): string {
    if (!nom) return '?';
    const p = nom.trim().split(' ');
    return p.length >= 2
        ? (p[0][0] + p[p.length-1][0]).toUpperCase()
        : nom.substring(0, 2).toUpperCase();
  }

  getAvatarColor(nom: string): string {
    const c = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6'];
    return c[(nom || '').charCodeAt(0) % c.length];
  }

  getNom(p: Projet): string {
    return p.nom;
  }

  /** Tooltip listant les superviseurs au-delà des 2 premiers affichés */
  getRestSuperviseursTooltip(supers: SuperviseurInfo[]): string {
    return supers.map(s => s.nomComplet).join(', ');
  }

  /** Tooltip listant les stagiaires au-delà des 2 premiers affichés */
  getRestStagiairesTooltip(stags: any[]): string {
    return stags.map(s => s.nomComplet).join(', ');
  }
}