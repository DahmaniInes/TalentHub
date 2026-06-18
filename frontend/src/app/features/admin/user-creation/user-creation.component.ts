import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { UserService }              from '../../../services/user.service';
import { ProfilService }            from '../../../services/profil.service';
import { StagiaireService }         from '../../../services/stagiaire.service';
import { NomenclatureAcademiqueService } from '../../../services/nomenclature-academique-service.service';
import { UiService }                from '../../../services/ui.service';
import { ErrorService }             from '../../../services/error.service';
import { PermissionContextService } from '../../../services/permission-context.service';

import { Profil }              from '../../../shared/models/profil.model';
import { Utilisateur }         from '../../../shared/models/utilisateur.model';
import { UserCreationRequest } from '../../../shared/models/user-creation-request.model';
import { HttpErrorResponse }   from '@angular/common/http';

function dateRangeValidator(startKey: string, endKey: string) {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startKey)?.value;
    const end   = group.get(endKey)?.value;
    if (start && end && new Date(start) >= new Date(end))
      return { dateRange: true };
    return null;
  };
}

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
  private stagSvc       = inject(StagiaireService);
  private nomenclatureAcad = inject(NomenclatureAcademiqueService);
  private errorService  = inject(ErrorService);
  private router        = inject(Router);
  private route         = inject(ActivatedRoute);
  readonly ui           = inject(UiService);
  readonly perms        = inject(PermissionContextService);

  steps       = ['Identité', 'Poste & Études', 'Accès', 'Récapitulatif'];
  currentStep = 1;
  focusState: Record<string, boolean> = {};

  userForm: FormGroup;
  profils    = signal<Profil[]>([]);
  superviseurs = signal<Utilisateur[]>([]);
  typesStage   = signal<any[]>([]);
  loading      = signal(false);

  // ✅ Nomenclature académique — listes chargées depuis la BD
  universites = signal<any[]>([]);
  specialites = signal<any[]>([]);
  niveaux     = signal<any[]>([]);

  // ✅ Mode "ajout manuel" par champ — true = afficher un input texte libre
  modeAjoutUniversite = signal(false);
  modeAjoutSpecialite = signal(false);

  superviseurSelectionnes = signal<number[]>([]);

  estStagiaire = computed(() => {
    const id = this.userForm?.get('profilId')?.value;
    if (!id) return false;
    const profil = this.profils().find(p => p.id == id);
    return profil?.nom?.toLowerCase().includes('stagiaire') ?? false;
  });

  superviseursDispo = computed(() =>
    this.superviseurs().filter(s => !this.superviseurSelectionnes().includes(s.id))
  );

  superviseurNomById(id: number): string {
    return this.superviseurs().find(s => s.id === id)?.nomComplet ?? `#${id}`;
  }

  private _preselectStagiaire = false;

  constructor() {
    this.userForm = this.fb.group({
      nom:            ['', [Validators.required, Validators.minLength(2)]],
      prenom:         ['', [Validators.required, Validators.minLength(2)]],
      email:          ['', [Validators.required, Validators.email]],
      // ✅ Téléphone : uniquement des chiffres (espaces autorisés à la saisie, validés ensuite)
      telephone:      ['', [Validators.pattern(/^[0-9\s]*$/)]],
      dateEmbauche:   [''],
      dateFinContrat: [''],
      poste:          [''],
      departement:    [''],
      adresse:        [''],

      // ✅ Académique — IDs depuis select, ou texte libre si ajout manuel
      universiteId:    [null],
      universiteTexte: [''],
      specialiteId:    [null],
      specialiteTexte: [''],
      niveauEtudeId:   [null],

      // Stage
      typeStageId:    [null],
      dateDebutStage: [''],
      dateFinStage:   [''],
      dateSoutenance: [''],
      // Profil
      profilId:       [null, Validators.required]
    }, {
      validators: [
        dateRangeValidator('dateDebutStage', 'dateFinStage'),
        dateRangeValidator('dateDebutStage', 'dateSoutenance')
      ]
    });

    // ✅ N'autoriser que des chiffres à la frappe (bloque lettres/symboles en temps réel)
    this.userForm.get('telephone')!.valueChanges.subscribe(val => {
      if (val == null) return;
      const filtered = val.replace(/[^0-9\s]/g, '');
      if (filtered !== val) {
        this.userForm.get('telephone')!.setValue(filtered, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    if (this.perms.canCreateUser()) {
      this.loadProfils();
      this.stagSvc.getSuperviseurs().subscribe({ next: d => this.superviseurs.set(d) });
      this.stagSvc.getTypesStage().subscribe({ next: d => this.typesStage.set(d) });
      this.loadNomenclatureAcademique();
    }
    this.route.queryParams.subscribe(params => {
      if (params['stagiaire'] === 'true') this._preselectStagiaire = true;
    });
  }

  private loadNomenclatureAcademique(): void {
    this.nomenclatureAcad.getAllUniversites().subscribe({
      next: d => this.universites.set((d || []).filter((u: any) => u.actif !== false))
    });
    this.nomenclatureAcad.getAllSpecialites().subscribe({
      next: d => this.specialites.set((d || []).filter((s: any) => s.actif !== false))
    });
    this.nomenclatureAcad.getAllNiveaux().subscribe({
      next: d => this.niveaux.set((d || []).filter((n: any) => n.actif !== false))
    });
  }

  private loadProfils(): void {
    this.profilService.getAllProfils().subscribe({
      next: data => {
        this.profils.set(data.filter(p => p.actif !== false));
        if (this._preselectStagiaire) {
          const stagProfil = data.find(p => p.nom?.toLowerCase().includes('stagiaire'));
          if (stagProfil) this.userForm.get('profilId')!.setValue(stagProfil.id);
        }
      },
      error: () => this.ui.error('Impossible de charger les profils.')
    });
  }

  // ✅ Gestion du select Université — bascule en mode ajout manuel si "+ Ajouter..."
  onUniversiteChange(value: string): void {
    if (value === '__AJOUTER__') {
      this.modeAjoutUniversite.set(true);
      this.userForm.get('universiteId')!.setValue(null);
    } else {
      this.modeAjoutUniversite.set(false);
      this.userForm.get('universiteId')!.setValue(value ? +value : null);
      this.userForm.get('universiteTexte')!.setValue('');
    }
  }

  annulerAjoutUniversite(): void {
    this.modeAjoutUniversite.set(false);
    this.userForm.get('universiteTexte')!.setValue('');
  }

  // ✅ Gestion du select Spécialité — bascule en mode ajout manuel si "+ Ajouter..."
  onSpecialiteChange(value: string): void {
    if (value === '__AJOUTER__') {
      this.modeAjoutSpecialite.set(true);
      this.userForm.get('specialiteId')!.setValue(null);
    } else {
      this.modeAjoutSpecialite.set(false);
      this.userForm.get('specialiteId')!.setValue(value ? +value : null);
      this.userForm.get('specialiteTexte')!.setValue('');
    }
  }

  annulerAjoutSpecialite(): void {
    this.modeAjoutSpecialite.set(false);
    this.userForm.get('specialiteTexte')!.setValue('');
  }

  ajouterSuperviseur(idStr: string): void {
    const id = +idStr;
    if (!id || this.superviseurSelectionnes().includes(id)) return;
    this.superviseurSelectionnes.update(list => [...list, id]);
  }

  retirerSuperviseur(id: number): void {
    this.superviseurSelectionnes.update(list => list.filter(x => x !== id));
  }

  isStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.userForm.get('prenom')!.valid
            && this.userForm.get('nom')!.valid
            && this.userForm.get('email')!.valid
            && this.userForm.get('telephone')!.valid;
      case 2:
        if (this.estStagiaire()) return !this.userForm.hasError('dateRange');
        return true;
      case 3: return this.userForm.get('profilId')!.valid;
      default: return true;
    }
  }

  nextStep(): void {
    if (!this.isStepValid()) { this.touchCurrentStep(); return; }
    if (this.currentStep < this.steps.length) this.currentStep++;
  }

  prevStep(): void { if (this.currentStep > 1) this.currentStep--; }

  goToStep(step: number): void { if (step <= this.currentStep) this.currentStep = step; }

  private touchCurrentStep(): void {
    const stepFields: Record<number, string[]> = {
      1: ['prenom', 'nom', 'email', 'telephone'],
      2: ['dateDebutStage', 'dateFinStage'],
      3: ['profilId'],
    };
    (stepFields[this.currentStep] || []).forEach(f => this.userForm.get(f)?.markAsTouched());
  }

  getSelectedProfilName(): string {
    const id = this.userForm.get('profilId')?.value;
    if (!id) return '—';
    return this.profils().find(p => p.id == id)?.nom ?? '—';
  }

  getTypeStageCode(id: any): string {
    return this.typesStage().find(t => t.id == id)?.code ?? '—';
  }

  // ✅ Libellés académiques pour le récapitulatif
  getUniversiteCode(): string {
    if (this.modeAjoutUniversite() || this.userForm.get('universiteTexte')?.value) {
      return this.userForm.get('universiteTexte')?.value || '—';
    }
    const id = this.userForm.get('universiteId')?.value;
    return this.universites().find((u: any) => u.id == id)?.libelle ?? '—';
  }

  getSpecialiteLibelle(): string {
    if (this.modeAjoutSpecialite() || this.userForm.get('specialiteTexte')?.value) {
      return this.userForm.get('specialiteTexte')?.value || '—';
    }
    const id = this.userForm.get('specialiteId')?.value;
    return this.specialites().find((s: any) => s.id == id)?.libelle ?? '—';
  }

  getNiveauLibelle(): string {
    const id = this.userForm.get('niveauEtudeId')?.value;
    return this.niveaux().find((n: any) => n.id == id)?.libelle ?? '—';
  }

  formatDate(fieldName: string): string {
    const val = this.userForm.get(fieldName)?.value;
    if (!val) return '—';
    try { return new Date(val).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }); }
    catch { return val; }
  }

  goBack(): void { this.router.navigate(['/users']); }

  // ✅ Crée l'université/spécialité saisie manuellement si besoin, avant de soumettre l'utilisateur
  private resoudreAcademique(): Promise<{ universiteId: number | null; specialiteId: number | null }> {
    const universiteTexte = (this.userForm.get('universiteTexte')?.value || '').trim();
    const specialiteTexte = (this.userForm.get('specialiteTexte')?.value || '').trim();

    const universitePromise: Promise<number | null> =
      this.modeAjoutUniversite() && universiteTexte
        ? this.nomenclatureAcad.createOrGetUniversite
            ? new Promise(resolve => {
                this.nomenclatureAcad.createOrGetUniversite(universiteTexte).subscribe({
                  next: (u: any) => resolve(u?.id ?? null),
                  error: () => resolve(null)
                });
              })
            : Promise.resolve(null)
        : Promise.resolve(this.userForm.get('universiteId')?.value ?? null);

    const specialitePromise: Promise<number | null> =
      this.modeAjoutSpecialite() && specialiteTexte
        ? this.nomenclatureAcad.createOrGetSpecialite
            ? new Promise(resolve => {
                this.nomenclatureAcad.createOrGetSpecialite(specialiteTexte).subscribe({
                  next: (s: any) => resolve(s?.id ?? null),
                  error: () => resolve(null)
                });
              })
            : Promise.resolve(null)
        : Promise.resolve(this.userForm.get('specialiteId')?.value ?? null);

    return Promise.all([universitePromise, specialitePromise]).then(
      ([universiteId, specialiteId]) => ({ universiteId, specialiteId })
    );
  }

  async onSubmit(): Promise<void> {
    if (!this.perms.canCreateUser()) { this.ui.warning('Permission USER_CREATE requise.'); return; }
    if (this.userForm.invalid || this.loading()) return;
    this.loading.set(true);

    const v = this.userForm.value;

    // ✅ Résout les IDs académiques (crée université/spécialité si saisie manuelle)
    const { universiteId, specialiteId } = await this.resoudreAcademique();

    const request: UserCreationRequest = {
      nom:            v.nom,
      prenom:         v.prenom,
      email:          v.email,
      telephone:      v.telephone      || null,
      dateEmbauche:   v.dateEmbauche   || null,
      dateFinContrat: v.dateFinContrat || null,
      poste:          v.poste          || null,
      departement:    v.departement    || null,
      adresse:        v.adresse        || null,
      profilId:       v.profilId,

      // ✅ IDs académiques résolus
      universiteId:  universiteId,
      specialiteId:  specialiteId,
      niveauEtudeId: v.niveauEtudeId || null,

      // Stage
      typeStageId:    this.estStagiaire() ? (v.typeStageId  || null) : null,
      dateDebutStage: this.estStagiaire() ? (v.dateDebutStage || null) : null,
      dateFinStage:   this.estStagiaire() ? (v.dateFinStage   || null) : null,
      dateSoutenance: this.estStagiaire() ? (v.dateSoutenance || null) : null,
    };

    this.userService.createUser(request).subscribe({
      next: () => {
        this.ui.success('✅ Utilisateur créé avec succès !');
        this.loading.set(false);
        this.userForm.reset();
        this.superviseurSelectionnes.set([]);
        this.modeAjoutUniversite.set(false);
        this.modeAjoutSpecialite.set(false);
        this.currentStep = 1;
        this.router.navigate(['/users']);
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error(this.errorService.parse(err).message);
        this.loading.set(false);
      }
    });
  }
}