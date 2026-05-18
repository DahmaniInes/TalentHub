// src/app/features/user-creation/user-creation.component.ts — avec permission USER_CREATE
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService }              from '../../../services/user.service';
import { ProfilService }            from '../../../services/profil.service';
import { UiService }                from '../../../services/ui.service';
import { ErrorService }             from '../../../services/error.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { Profil }                   from '../../../shared/models/profil.model';
import { UserCreationRequest }      from '../../../shared/models/user-creation-request.model';
import { HttpErrorResponse }        from '@angular/common/http';

@Component({
  selector: 'app-user-creation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './user-creation.component.html',
  styleUrls: ['./user-creation.component.css']
})
export class UserCreationComponent implements OnInit {

  private fb            = inject(FormBuilder);
  private userService   = inject(UserService);
  private profilService = inject(ProfilService);
  private errorService  = inject(ErrorService);
  private router        = inject(Router);
  readonly ui           = inject(UiService);
  // ✅ NOUVEAU
  readonly perms        = inject(PermissionContextService);

  // ── Stepper ──
  steps       = ['Identité', 'Poste', 'Accès', 'Récapitulatif'];
  currentStep = 1;
  focusState: Record<string, boolean> = {};

  userForm: FormGroup;
  profils  = signal<Profil[]>([]);
  loading  = signal(false);

  constructor() {
    this.userForm = this.fb.group({
      // Step 1 — obligatoires
      nom:            ['', [Validators.required, Validators.minLength(2)]],
      prenom:         ['', [Validators.required, Validators.minLength(2)]],
      email:          ['', [Validators.required, Validators.email]],
      telephone:      [''],
      // Step 2 — tous optionnels
      dateEmbauche:   [''],
      dateFinContrat: [''],
      poste:          [''],
      departement:    [''],
      adresse:        [''],
      // Step 3 — obligatoire
      profilId:       [null, Validators.required]
    });
  }

  ngOnInit(): void {
    // ✅ Si pas la permission, ne pas charger les profils (accès refusé géré dans le template)
    if (this.perms.canCreateUser()) {
      this.loadProfils();
    }
  }

  private loadProfils(): void {
    this.profilService.getAllProfils().subscribe({
      next: data => this.profils.set(data.filter(p => p.actif !== false)),
      error: () => this.ui.error('Impossible de charger les profils.')
    });
  }

  // ── Validation par étape ──
  isStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.userForm.get('prenom')!.valid
            && this.userForm.get('nom')!.valid
            && this.userForm.get('email')!.valid;
      case 2: return true;
      case 3: return this.userForm.get('profilId')!.valid;
      default: return true;
    }
  }

  nextStep(): void {
    if (!this.isStepValid()) { this.touchCurrentStep(); return; }
    if (this.currentStep < this.steps.length) this.currentStep++;
  }

  prevStep(): void { if (this.currentStep > 1) this.currentStep--; }

  goToStep(step: number): void {
    if (step <= this.currentStep) this.currentStep = step;
  }

  private touchCurrentStep(): void {
    const stepFields: Record<number, string[]> = {
      1: ['prenom', 'nom', 'email'],
      3: ['profilId'],
    };
    (stepFields[this.currentStep] || []).forEach(f => this.userForm.get(f)?.markAsTouched());
  }

  // ── Helpers récapitulatif ──
  getSelectedProfilName(): string {
    const id = this.userForm.get('profilId')?.value;
    if (!id) return '—';
    return this.profils().find(p => p.id == id)?.nom ?? '—';
  }

  formatDate(fieldName: string): string {
    const val = this.userForm.get(fieldName)?.value;
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
    } catch { return val; }
  }

  goBack(): void { this.router.navigate(['/users']); }

  // ── Soumission ──
  onSubmit(): void {
    // ✅ Double vérification côté TS
    if (!this.perms.canCreateUser()) { this.ui.warning('Permission USER_CREATE requise.'); return; }
    if (this.userForm.invalid || this.loading()) return;
    this.loading.set(true);

    const v = this.userForm.value;
    const request: UserCreationRequest = {
      nom:            v.nom,
      prenom:         v.prenom,
      email:          v.email,
      telephone:      v.telephone  || null,
      dateEmbauche:   v.dateEmbauche   || null,
      dateFinContrat: v.dateFinContrat || null,
      poste:          v.poste          || null,
      departement:    v.departement    || null,
      adresse:        v.adresse        || null,
      profilId:       v.profilId,
      permissions:    []
    };

    this.userService.createUser(request).subscribe({
      next: () => {
        this.ui.success('✅ Utilisateur créé avec succès !');
        this.loading.set(false);
        this.userForm.reset();
        this.currentStep = 1;
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error(this.errorService.parse(err).message);
        this.loading.set(false);
      }
    });
  }
}