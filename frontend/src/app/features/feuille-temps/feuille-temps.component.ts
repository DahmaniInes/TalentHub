// src/app/features/feuille-temps/feuille-temps.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { FeuilleTempsService } from '../../services/feuille-temps.service';
import { UserService } from '../../services/user.service';
import { KeycloakService } from '../../services/keycloak.service';
import { ErrorService } from '../../services/error.service';
import { PermissionService } from '../../services/permission.service';
import { UiService } from '../../services/ui.service';
import {
  FeuilleTemps, FeuilleTempsRequest,
  LigneFeuilleTemps, CategorieFT
} from '../../shared/models/feuille-temps.model';
import { Utilisateur } from '../../shared/models/utilisateur.model';

@Component({
  selector: 'app-feuille-temps',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './feuille-temps.component.html',
  styleUrls: ['./feuille-temps.component.css']
})
export class FeuilleTempsComponent implements OnInit {
  private ftService     = inject(FeuilleTempsService);
  private userService   = inject(UserService);
  private keycloak      = inject(KeycloakService);
  private errorSvc      = inject(ErrorService);
  private router        = inject(Router);
  private permissionSvc = inject(PermissionService);
  readonly ui           = inject(UiService);

  // ── State ──
  feuilles       = signal<FeuilleTemps[]>([]);
  currentUser    = signal<Utilisateur | null>(null);
  loading        = signal(false);
  filterStatut   = signal<string>('TOUS');
  estApprobateur = signal<boolean>(false);
  badgeApprobations = signal<number>(0);

  // ── Vues ──
  activeView     = signal<'liste' | 'saisie'>('liste');
  editingFeuille = signal<FeuilleTemps | null>(null);

  // ── Saisie ──
  lignesSaisie      = signal<LigneFeuilleTemps[]>([]);
  semaineCourante   = signal<string>(FeuilleTempsService.getLundiSemaine());
  commentaireGlobal = '';

  readonly categories: { code: CategorieFT; label: string; couleur: string; icon: string }[] = [
    { code: 'TRAVAIL', label: 'Travail',  couleur: '#3b82f6', icon: '💼' },
    { code: 'CONGE',   label: 'Congé',    couleur: '#f59e0b', icon: '🏖️' },
    { code: 'MALADIE', label: 'Maladie',  couleur: '#ef4444', icon: '🤒' },
    { code: 'FERIE',   label: 'Férié',    couleur: '#8b5cf6', icon: '🎉' },
    { code: 'AUTRE',   label: 'Autre',    couleur: '#6b7280', icon: '📌' }
  ];

  readonly joursSemaine = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

  // ── Computed ──
  filteredFeuilles = computed(() => {
    const s = this.filterStatut();
    return s === 'TOUS' ? this.feuilles() : this.feuilles().filter(ft => ft.statut === s);
  });

  totalMinutesTravailles = computed(() =>
    this.feuilles().reduce((sum, ft) => sum + (ft.minutesTravaillees || 0), 0)
  );

  countSoumises = computed(() => this.feuilles().filter(f => f.statut === 'SOUMISE').length);
  countValidees = computed(() => this.feuilles().filter(f => f.statut === 'VALIDEE').length);
  countBrouillons = computed(() => this.feuilles().filter(f => f.statut === 'BROUILLON').length);
  countRejetees = computed(() => this.feuilles().filter(f => f.statut === 'REJETEE').length);

  totalSemaineMinutes = computed(() =>
    this.lignesSaisie().reduce((s, l) =>
      s + l.minutesNormales + l.minutesSupplementaires + l.minutesAbsence, 0)
  );

  get totalNormalesSemaine(): number { return this.lignesSaisie().reduce((s, l) => s + l.minutesNormales, 0); }
  get totalSuppSemaine(): number     { return this.lignesSaisie().reduce((s, l) => s + l.minutesSupplementaires, 0); }
  get totalAbsenceSemaine(): number  { return this.lignesSaisie().reduce((s, l) => s + l.minutesAbsence, 0); }

  readonly formatMin = (min: number) => FeuilleTempsService.formatMinutes(min);
  countByStatut(s: string): number { return this.feuilles().filter(f => f.statut === s).length; }

  // ── Règles métier ──
  peutModifier(ft: FeuilleTemps): boolean { return ft.statut === 'BROUILLON' || ft.statut === 'REJETEE'; }
  peutSoumettre(ft: FeuilleTemps): boolean { return ft.statut === 'BROUILLON' || ft.statut === 'REJETEE'; }
  peutAnnulerSoumission(ft: FeuilleTemps): boolean { return ft.statut === 'SOUMISE'; }
  peutSupprimer(ft: FeuilleTemps): boolean { return ft.statut === 'BROUILLON' || ft.statut === 'REJETEE'; }

  ngOnInit(): void { this.loadCurrentUser(); }

  private loadCurrentUser(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (!kcId) { this.loadFeuilles(); return; }

    this.userService.getUserByKeycloakId(kcId).subscribe({
      next: (u: Utilisateur) => {
        this.currentUser.set(u);
        this.verifierPermissionApprobateur(u);
        this.loadFeuilles(u.id);
      },
      error: () => this.loadFeuilles()
    });
  }

  private verifierPermissionApprobateur(u: Utilisateur): void {
    if (!u.profilId) { this.estApprobateur.set(false); return; }
    this.permissionSvc.hasPermission(u.profilId, 'Feuille de temps', 'Traiter les feuilles de temps')
      .subscribe(ok => {
        this.estApprobateur.set(ok);
        if (ok) {
          this.ftService.getSoumises().subscribe({
            next: fts => this.badgeApprobations.set(fts.filter(f => f.statut === 'SOUMISE').length),
            error: () => {}
          });
        }
      });
  }

  loadFeuilles(userId?: number): void {
    this.loading.set(true);
    const obs = userId ? this.ftService.getByUtilisateur(userId) : this.ftService.getAll();
    obs.subscribe({
      next: fts => { this.feuilles.set(fts); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  ouvrirNouvelleSaisie(): void {
    const lundi = FeuilleTempsService.getLundiSemaine();
    this.semaineCourante.set(lundi);
    this.commentaireGlobal = '';
    this.editingFeuille.set(null);
    this.initLignesSaisie(lundi);
    this.activeView.set('saisie');
  }

  ouvrirEditionSaisie(ft: FeuilleTemps): void {
    this.semaineCourante.set(ft.semaineDu);
    this.commentaireGlobal = ft.commentaireEmploye || '';
    this.editingFeuille.set(ft);
    this.initLignesSaisie(ft.semaineDu, ft.lignes);
    this.activeView.set('saisie');
  }

  ouvrirApprobations(): void { this.router.navigate(['/approbations-ft']); }
  retourListe(): void { this.activeView.set('liste'); }

  private initLignesSaisie(lundi: string, existantes?: LigneFeuilleTemps[]): void {
    const lignes: LigneFeuilleTemps[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(lundi);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const existing = existantes?.find(l => l.date === dateStr);
      lignes.push(existing ?? {
        date: dateStr, categorieCode: 'TRAVAIL',
        heureDebut: '08:00', heureFin: '17:00',
        minutesNormales: 480, minutesSupplementaires: 0,
        minutesAbsence: 0, commentaire: ''
      });
    }
    this.lignesSaisie.set(lignes);
  }

  onSemaineChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (val) this.changerSemaine(val);
  }

  onSelectChange(event: Event, index: number, field: keyof LigneFeuilleTemps): void {
    this.updateLigne(index, field, (event.target as HTMLSelectElement).value);
  }

  onInputChange(event: Event, index: number, field: keyof LigneFeuilleTemps, numeric = false): void {
    const val = (event.target as HTMLInputElement).value;
    this.updateLigne(index, field, numeric ? +val : val);
  }

  changerSemaine(lundi: string): void {
    this.semaineCourante.set(lundi);
    this.initLignesSaisie(lundi);
  }

  updateLigne(index: number, field: keyof LigneFeuilleTemps, value: any): void {
    const lignes = [...this.lignesSaisie()];
    (lignes[index] as any)[field] = value;

    if (field === 'heureDebut' || field === 'heureFin') {
      const debut = lignes[index].heureDebut;
      const fin   = lignes[index].heureFin;
      if (debut && fin) {
        const [dh, dm] = debut.split(':').map(Number);
        const [fh, fm] = fin.split(':').map(Number);
        const totalMin = (fh * 60 + fm) - (dh * 60 + dm);
        if (totalMin > 0 && lignes[index].categorieCode === 'TRAVAIL') {
          lignes[index].minutesNormales = Math.min(totalMin, 480);
          lignes[index].minutesSupplementaires = Math.max(0, totalMin - 480);
        }
      }
    }

    if (field === 'categorieCode') {
      if (['CONGE', 'MALADIE', 'FERIE'].includes(value)) {
        lignes[index].heureDebut = '';
        lignes[index].heureFin = '';
        lignes[index].minutesNormales = 0;
        lignes[index].minutesSupplementaires = 0;
        lignes[index].minutesAbsence = 480;
      } else if (value === 'TRAVAIL') {
        lignes[index].heureDebut = '08:00';
        lignes[index].heureFin = '17:00';
        lignes[index].minutesNormales = 480;
        lignes[index].minutesAbsence = 0;
      }
    }

    this.lignesSaisie.set(lignes);
  }

  sauvegarder(soumettre = false): void {
    const user = this.currentUser();
    if (!user) { this.ui.error('Utilisateur non trouvé.'); return; }
    this.loading.set(true);

    const lignes = this.lignesSaisie();
    const req: FeuilleTempsRequest = {
      utilisateurId: user.id,
      semaineDu: this.semaineCourante(),
      semaineAu: FeuilleTempsService.getVendrediSemaine(this.semaineCourante()),
      minutesTravaillees: lignes.reduce((s, l) => s + l.minutesNormales, 0),
      minutesSupplementaires: lignes.reduce((s, l) => s + l.minutesSupplementaires, 0),
      minutesAbsence: lignes.reduce((s, l) => s + l.minutesAbsence, 0),
      statut: soumettre ? 'SOUMISE' : 'BROUILLON',
      commentaireEmploye: this.commentaireGlobal,
      lignes
    };

    const id = this.editingFeuille()?.id;
    const obs = id ? this.ftService.update(id, req) : this.ftService.create(req);

    obs.subscribe({
      next: () => {
        this.ui.success(soumettre ? '✅ Feuille soumise avec succès !' : '💾 Brouillon enregistré.');
        this.activeView.set('liste');
        this.loadFeuilles(user.id);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error(this.errorSvc.parse(err).message);
        this.loading.set(false);
      }
    });
  }

  // ✅ Remplace confirm() natif par popup
  soumettre(ft: FeuilleTemps): void {
    this.ui.confirm({
      title: 'Soumettre la feuille',
      message: `Envoyer la feuille du ${this.formatDateLong(ft.semaineDu)} pour validation ? Cette action ne pourra pas être annulée facilement.`,
      confirmLabel: 'Soumettre',
      cancelLabel: 'Pas maintenant',
      type: 'info',
      onConfirm: () => {
        this.ftService.soumettre(ft.id).subscribe({
          next: () => {
            this.ui.success('📋 Feuille soumise pour validation.');
            this.loadFeuilles(this.currentUser()?.id);
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  annulerSoumission(ft: FeuilleTemps): void {
    this.ui.confirm({
      title: 'Annuler la soumission',
      message: 'La feuille repassera en brouillon et pourra être modifiée à nouveau.',
      confirmLabel: 'Annuler la soumission',
      cancelLabel: 'Garder',
      type: 'warning',
      onConfirm: () => {
        this.ftService.annulerSoumission(ft.id).subscribe({
          next: () => {
            this.ui.success('↩️ Soumission annulée — feuille en brouillon.');
            this.loadFeuilles(this.currentUser()?.id);
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  delete(ft: FeuilleTemps): void {
    this.ui.confirm({
      title: 'Supprimer la feuille',
      message: `Supprimer définitivement la feuille du ${this.formatDateLong(ft.semaineDu)} ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      type: 'danger',
      onConfirm: () => {
        this.ftService.delete(ft.id).subscribe({
          next: () => {
            this.ui.success('🗑️ Feuille supprimée.');
            this.loadFeuilles(this.currentUser()?.id);
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  // ── Helpers UI ──
  statutColor(s: string): string {
    return { BROUILLON: 'gray', SOUMISE: 'blue', VALIDEE: 'green', REJETEE: 'red' }[s] ?? 'gray';
  }

  statutLabel(s: string): string {
    return { BROUILLON: 'Brouillon', SOUMISE: 'Soumise', VALIDEE: 'Validée', REJETEE: 'Rejetée' }[s] ?? s;
  }

  statutIcon(s: string): string {
    return { BROUILLON: '✏️', SOUMISE: '⏳', VALIDEE: '✅', REJETEE: '❌' }[s] ?? '📄';
  }

  getPct(minutes: number, total: number): number {
    return total ? Math.min(100, Math.round((minutes / total) * 100)) : 0;
  }

  getCatCouleur(code: string): string {
    return this.categories.find(c => c.code === code)?.couleur ?? '#6b7280';
  }

  getCatLabel(code: string): string {
    return this.categories.find(c => c.code === code)?.label ?? code;
  }

  jourDeSemaine(dateStr: string): string {
    return this.joursSemaine[new Date(dateStr).getDay() - 1] ?? '';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  formatDateLong(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  totalLigne(l: LigneFeuilleTemps): number {
    return l.minutesNormales + l.minutesSupplementaires + l.minutesAbsence;
  }
}