import { Component, OnInit, inject, signal, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KeycloakService }              from '../../services/keycloak.service';
import { UserService }                  from '../../services/user.service';
import { StagiaireService }             from '../../services/stagiaire.service';
import { NomenclatureAcademiqueService } from '../../services/nomenclature-academique-service.service';
import { Utilisateur }                  from '../../shared/models/utilisateur.model';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './complete-profile.component.html',
  styleUrl: './complete-profile.component.css'
})
export class CompleteProfileComponent implements OnInit {

  private keycloak   = inject(KeycloakService);
  private userSvc    = inject(UserService);
  private stagSvc    = inject(StagiaireService);
  private nomencSvc  = inject(NomenclatureAcademiqueService);
  private router     = inject(Router);
  private fb         = inject(FormBuilder);

  profileForm: FormGroup;
  loading      = signal(false);
  success      = signal(false);
  errorMsg     = signal<string | null>(null);
  selectedFile: File | null = null;
  previewUrl   = signal<string | null>(null);
  currentUser  = signal<Utilisateur | null>(null);
  typesStage   = signal<any[]>([]);
  universites  = signal<any[]>([]);
  specialites  = signal<any[]>([]);
  niveaux      = signal<any[]>([]);
  isDark       = false;

  // Focus states
  dateNaissanceFocused  = false;
  dateFinFocused        = false;
  telFocused            = false;
  posteFocused          = false;
  deptFocused           = false;
  adresseFocused        = false;
  universiteFocused     = false;
  specialiteFocused     = false;
  niveauEtudeFocused    = false;
  dateDebutStageFocused = false;
  dateFinStageFocused   = false;
  dateSoutenanceFocused = false;

  get estStagiaire(): boolean {
    return this.currentUser()?.profilNom?.toLowerCase().includes('stagiaire') ?? false;
  }

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.profileForm = this.fb.group({
      dateNaissance:  [''],
      dateFinContrat: [''],
      telephone:      [''],
      adresse:        [''],
      poste:          [''],
      departement:    [''],
      // ✅ Champs académiques — IDs vers nomenclature
      universiteId:   [null],
      specialiteId:   [null],
      niveauEtudeId:  [null],
      // Stage
      typeStageId:    [null],
      dateDebutStage: [''],
      dateFinStage:   [''],
      dateSoutenance: [''],
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('theme') || 'light';
      this.isDark = saved === 'dark';
      this.applyTheme(this.isDark);
    }

    // ✅ Charger nomenclature via StagiaireService et NomenclatureAcademiqueService
    this.stagSvc.getTypesStage().subscribe({ next: (d: any[]) => this.typesStage.set(d) });
    this.nomencSvc.getUniversites().subscribe({ next: d => this.universites.set(d) });
    this.nomencSvc.getSpecialites().subscribe({ next: d => this.specialites.set(d) });
    this.nomencSvc.getNiveaux().subscribe({ next: d => this.niveaux.set(d) });

    this.loadExistingProfile();
  }

  toggleTheme(): void {
    const next = !this.isDark;
    if (!(document as any).startViewTransition) {
      this.isDark = next;
      this.applyTheme(next);
      return;
    }
    document.documentElement.classList.toggle('going-light', !next);
    (document as any).startViewTransition(() => {
      this.isDark = next;
      this.applyTheme(next);
    });
  }

  private applyTheme(dark: boolean): void {
    dark
      ? document.documentElement.classList.add('dark')
      : document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }

  private loadExistingProfile(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (!kcId) return;
    this.userSvc.getUserByKeycloakId(kcId).subscribe({
      next: (u: Utilisateur) => {
        this.currentUser.set(u);
        // ✅ Utilise les IDs nomenclature — plus de Strings universite/specialite/niveauEtude
        this.profileForm.patchValue({
          dateNaissance:  u.dateNaissance  || '',
          dateFinContrat: u.dateFinContrat || '',
          telephone:      u.telephone      || '',
          adresse:        u.adresse        || '',
          poste:          u.poste          || '',
          departement:    u.departement    || '',
          universiteId:   u.universiteId   || null,
          specialiteId:   u.specialiteId   || null,
          niveauEtudeId:  u.niveauEtudeId  || null,
          // ✅ Stage via le premier stage actif
          typeStageId:    u.stages?.[0]?.typeStageId    || null,
          dateDebutStage: u.stages?.[0]?.dateDebut      || '',
          dateFinStage:   u.stages?.[0]?.dateFin        || '',
          dateSoutenance: u.stages?.[0]?.dateSoutenance || '',
        });
        if (u.photoUrl) this.previewUrl.set(u.photoUrl);
      },
      error: () => console.info('Profil non trouvé, formulaire vide')
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.errorMsg.set('Sélectionnez une image.'); return; }
    if (file.size > 5 * 1024 * 1024)    { this.errorMsg.set('Image trop lourde (max 5 Mo).'); return; }
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => this.previewUrl.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this.errorMsg.set(null);
  }

  onSubmit(): void {
    this.loading.set(true);
    this.errorMsg.set(null);
    const formData = new FormData();
    formData.append('updates', new Blob(
      [JSON.stringify(this.profileForm.value)],
      { type: 'application/json' }
    ));
    if (this.selectedFile) formData.append('photo', this.selectedFile);

    this.userSvc.updateUserProfileWithPhoto(formData).subscribe({
      next: () => {
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/home']), 1500);
      },
      error: () => {
        this.errorMsg.set('Une erreur est survenue. Réessayez.');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }

  skip(): void { this.router.navigate(['/home']); }

  get userInitials(): string {
    const u = this.currentUser();
    if (!u) return '?';
    return ((u.prenom?.[0] ?? '') + (u.nom?.[0] ?? '')).toUpperCase();
  }
}