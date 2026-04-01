import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FeuilleTempsService } from '../../services/feuille-temps.service';
import { UserService } from '../../services/user.service';
import { KeycloakService } from '../../services/keycloak.service';
import { ErrorService } from '../../services/error.service';
import { FeuilleTemps, FeuilleTempsRequest } from '../../shared/models/feuille-temps.model';
import { Utilisateur } from '../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-feuille-temps',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './feuille-temps.component.html',
  styleUrls: ['./feuille-temps.component.css']
})
export class FeuilleTempsComponent implements OnInit {
  private ftService   = inject(FeuilleTempsService);
  private userService = inject(UserService);
  private keycloak    = inject(KeycloakService);
  private errorSvc    = inject(ErrorService);
  private fb          = inject(FormBuilder);

  // ── State ──
  feuilles       = signal<FeuilleTemps[]>([]);
  utilisateurs   = signal<Utilisateur[]>([]);
  loading        = signal(false);
  errorMessage   = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showModal      = signal(false);
  editingId      = signal<number | null>(null);
  filterStatut   = signal<string>('TOUS');

  // ── Computed ──
  filteredFeuilles = computed(() => {
    const all = this.feuilles();
    const s   = this.filterStatut();
    return s === 'TOUS' ? all : all.filter(ft => ft.statut === s);
  });

  totalMinutesTravailles = computed(() =>
    this.feuilles().reduce((sum, ft) => sum + (ft.minutesTravaillees || 0), 0)
  );

  countSoumises = computed(() =>
    this.feuilles().filter(f => f.statut === 'SOUMISE').length
  );

  countValidees = computed(() =>
    this.feuilles().filter(f => f.statut === 'VALIDEE').length
  );

  countByStatut(s: string): number {
    return this.feuilles().filter(f => f.statut === s).length;
  }

  // ── Référence aux utilitaires statiques exposés au template ──
  readonly formatMin = (min: number) => FeuilleTempsService.formatMinutes(min);

  // ── Formulaire ──
  form: FormGroup;

  constructor() {
    const lundi = FeuilleTempsService.getLundiSemaine();
    this.form = this.fb.group({
      utilisateurId:         [null, Validators.required],
      semaineDu:             [lundi, Validators.required],
      semaineAu:             [FeuilleTempsService.getVendrediSemaine(lundi), Validators.required],
      minutesTravaillees:    [0, [Validators.required, Validators.min(0), Validators.max(7200)]],
      minutesSupplementaires:[0, [Validators.min(0), Validators.max(1440)]],
      minutesAbsence:        [0, [Validators.min(0), Validators.max(7200)]],
      commentaireEmploye:    ['']
    });

    // Auto-calcul vendredi
    this.form.get('semaineDu')!.valueChanges.subscribe(val => {
      if (val) {
        this.form.get('semaineAu')!.setValue(
          FeuilleTempsService.getVendrediSemaine(val), { emitEvent: false }
        );
      }
    });
  }

  ngOnInit(): void {
    this.loadFeuilles();
    this.loadUtilisateurs();
  }

  private loadFeuilles(): void {
    this.loading.set(true);
    const keycloakId = this.keycloak.getKeycloakUserId();

    if (keycloakId) {
      this.userService.getUserByKeycloakId(keycloakId).subscribe({
        next: (u: Utilisateur) => {
          this.ftService.getByUtilisateur(u.id).subscribe({
            next: (fts: FeuilleTemps[]) => { this.feuilles.set(fts); this.loading.set(false); },
            error: () => this.loading.set(false)
          });
        },
        error: () => {
          this.ftService.getAll().subscribe({
            next: (fts: FeuilleTemps[]) => { this.feuilles.set(fts); this.loading.set(false); },
            error: () => this.loading.set(false)
          });
        }
      });
    } else {
      this.ftService.getAll().subscribe({
        next: (fts: FeuilleTemps[]) => { this.feuilles.set(fts); this.loading.set(false); },
        error: () => this.loading.set(false)
      });
    }
  }

  private loadUtilisateurs(): void {
    this.userService.getAllUsers().subscribe({
      next: (users: Utilisateur[]) => this.utilisateurs.set(users),
      error: () => {}
    });
  }

  // ── CRUD ──
  openCreate(): void {
    this.editingId.set(null);
    const lundi = FeuilleTempsService.getLundiSemaine();
    this.form.reset({
      utilisateurId: null,
      semaineDu: lundi,
      semaineAu: FeuilleTempsService.getVendrediSemaine(lundi),
      minutesTravaillees: 0,
      minutesSupplementaires: 0,
      minutesAbsence: 0,
      commentaireEmploye: ''
    });
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  openEdit(ft: FeuilleTemps): void {
    this.editingId.set(ft.id);
    this.form.patchValue({
      utilisateurId: ft.utilisateurId,
      semaineDu: ft.semaineDu,
      semaineAu: ft.semaineAu,
      minutesTravaillees: ft.minutesTravaillees,
      minutesSupplementaires: ft.minutesSupplementaires,
      minutesAbsence: ft.minutesAbsence,
      commentaireEmploye: ft.commentaireEmploye || ''
    });
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.errorMessage.set('Veuillez remplir correctement tous les champs obligatoires.');
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);

    const req: FeuilleTempsRequest = this.form.value;
    const id = this.editingId();
    const obs = id ? this.ftService.update(id, req) : this.ftService.create(req);

    obs.subscribe({
      next: () => {
        this.showModal.set(false);
        this.successMessage.set(id ? 'Feuille modifiée avec succès.' : 'Feuille créée avec succès.');
        this.loadFeuilles();
        this.loading.set(false);
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(this.errorSvc.parse(err).message);
        this.loading.set(false);
      }
    });
  }

  soumettre(ft: FeuilleTemps): void {
    if (!confirm('Soumettre cette feuille pour validation ?')) return;
    this.ftService.soumettre(ft.id).subscribe({
      next: () => { this.successMessage.set('Feuille soumise.'); this.loadFeuilles(); },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorSvc.parse(err).message)
    });
  }

  delete(ft: FeuilleTemps): void {
    if (!confirm(`Supprimer la feuille du ${ft.semaineDu} ?`)) return;
    this.ftService.delete(ft.id).subscribe({
      next: () => { this.successMessage.set('Feuille supprimée.'); this.loadFeuilles(); },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorSvc.parse(err).message)
    });
  }

  // ── UI Helpers ──
  statutColor(s: string): string {
    const map: Record<string, string> = {
      BROUILLON: 'gray', SOUMISE: 'blue', VALIDEE: 'green', REJETEE: 'red'
    };
    return map[s] ?? 'gray';
  }

  statutLabel(s: string): string {
    const map: Record<string, string> = {
      BROUILLON: 'Brouillon', SOUMISE: 'Soumise', VALIDEE: 'Validée', REJETEE: 'Rejetée'
    };
    return map[s] ?? s;
  }

  getPct(minutes: number, total: number): number {
    if (!total) return 0;
    return Math.min(100, Math.round((minutes / total) * 100));
  }

  getPreview(controlName: string): string {
    const val = this.form.get(controlName)?.value;
    return val ? FeuilleTempsService.formatMinutes(val) : '';
  }
}