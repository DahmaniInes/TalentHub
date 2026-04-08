// src/app/features/user-creation/user-creation.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { ProfilService } from '../../../services/profil.service';
import { PermissionService } from '../../../services/permission.service';
import { UiService } from '../../../services/ui.service';
import { Permission } from '../../../shared/models/permission.model';
import { Profil } from '../../../shared/models/profil.model';
import { PermissionSelection, UserCreationRequest } from '../../../shared/models/user-creation-request.model';
import { Utilisateur } from '../../../shared/models/utilisateur.model';
import { ErrorService } from '../../../services/error.service';
import { HttpErrorResponse } from '@angular/common/http';

export interface PermissionRow {
  permission: Permission;
  selected: boolean;
  showMenu: boolean;
  editing: boolean;
  editForm: Partial<Permission>;
}

export interface ModuleGroup {
  module: string;
  rows: PermissionRow[];
  showMenu: boolean;
  editing: boolean;
  editName: string;
}

@Component({
  selector: 'app-user-creation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DatePipe],
  templateUrl: './user-creation.component.html',
  styleUrls: ['./user-creation.component.css']
})
export class UserCreationComponent implements OnInit {
  private fb              = inject(FormBuilder);
  private userService     = inject(UserService);
  private profilService   = inject(ProfilService);
  private permissionService = inject(PermissionService);
  private errorService    = inject(ErrorService);
  readonly ui             = inject(UiService);

  steps = ['Identité', 'Poste', 'Accès', 'Récapitulatif'];
  currentStep = 1;
  focusState: Record<string, boolean> = {};

  userForm: FormGroup;

  profils        = signal<Profil[]>([]);
  moduleGroups   = signal<ModuleGroup[]>([]);
  loading        = signal(false);
  loadingPerms   = signal(false);
  errorMessage   = signal<string | null>(null);

  selectedPermsCount = computed(() =>
    this.moduleGroups().flatMap(g => g.rows).filter(r => r.selected).length
  );

  showAddPermModal   = signal(false);
  showAddProfilModal = signal(false);
  newPermForm   = signal({ code: '', libelle: '', module: '', description: '', actif: true });
  newProfilForm = signal({ nom: '', description: '', actif: true });
  editingProfil = signal<Profil | null>(null);
  showProfilMenu = signal<number | null>(null);

  constructor() {
    this.userForm = this.fb.group({
      nom:          ['', [Validators.required, Validators.minLength(2)]],
      prenom:       ['', [Validators.required, Validators.minLength(2)]],
      email:        ['', [Validators.required, Validators.email]],
      telephone:    [''],
      dateEmbauche: [''],
      poste:        [''],
      departement:  [''],
      adresse:      [''],
      profilId:     [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadProfils();
    this.loadPermissions();
  }

  // ── Stepper ──
  isStepValid(): boolean {
    switch (this.currentStep) {
      case 1: return this.userForm.get('prenom')!.valid
                  && this.userForm.get('nom')!.valid
                  && this.userForm.get('email')!.valid;
      case 2: return this.userForm.get('dateEmbauche')!.valid;
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
      1: ['prenom', 'nom', 'email'],
      2: ['dateEmbauche'],
      3: ['profilId'],
    };
    (stepFields[this.currentStep] || []).forEach(f => this.userForm.get(f)?.markAsTouched());
  }

  // ── Data loading ──
  private loadProfils(): void {
    this.profilService.getAllProfils().subscribe({
      next: data => this.profils.set(data),
      error: () => this.ui.error('Erreur lors du chargement des profils.')
    });
  }

  private loadPermissions(): void {
    this.loadingPerms.set(true);
    this.permissionService.getAllPermissions().subscribe({
      next: perms => { this.buildModuleGroups(perms); this.loadingPerms.set(false); },
      error: () => this.loadingPerms.set(false)
    });
  }

  private buildModuleGroups(perms: Permission[]): void {
    const map = new Map<string, PermissionRow[]>();
    perms.forEach(p => {
      const mod = p.module || 'AUTRE';
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod)!.push({
        permission: p, selected: false,
        showMenu: false, editing: false, editForm: { ...p }
      });
    });
    const groups: ModuleGroup[] = [];
    map.forEach((rows, module) =>
      groups.push({ module, rows, showMenu: false, editing: false, editName: module })
    );
    this.moduleGroups.set(groups);
  }

  getModules(): ModuleGroup[] { return this.moduleGroups(); }

  // ✅ CORRIGÉ — retourne le nom du profil sélectionné, pas l'objet
  getSelectedProfilName(): string {
    const id = this.userForm.get('profilId')?.value;
    if (!id) return '—';
    const found = this.profils().find(p => p.id == id);
    return found?.nom ?? '—';
  }

  // ✅ CORRIGÉ — date d'embauche formatée pour le récapitulatif
  getDateEmbaucheFormatted(): string {
    const val = this.userForm.get('dateEmbauche')?.value;
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
    } catch { return val; }
  }

  // ── Permissions CRUD ──
  openAddPermModal(): void { this.showAddPermModal.set(true); }

  closeAddPermModal(): void {
    this.showAddPermModal.set(false);
    this.newPermForm.set({ code: '', libelle: '', module: '', description: '', actif: true });
  }

  togglePermMenu(row: PermissionRow, event: Event): void {
    event.stopPropagation();
    this.moduleGroups().forEach(g => g.rows.forEach(r => { if (r !== row) r.showMenu = false; }));
    row.showMenu = !row.showMenu;
    this.moduleGroups.set([...this.moduleGroups()]);
  }

  startEditPerm(row: PermissionRow): void {
    row.editing = true; row.editForm = { ...row.permission }; row.showMenu = false;
    this.moduleGroups.set([...this.moduleGroups()]);
  }

  saveEditPerm(row: PermissionRow): void {
    this.permissionService.updatePermission(row.permission.id, row.editForm).subscribe({
      next: () => { row.editing = false; this.loadPermissions(); this.ui.success('Permission mise à jour.'); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorService.parse(err).message)
    });
  }

  cancelEditPerm(row: PermissionRow): void {
    row.editing = false; this.moduleGroups.set([...this.moduleGroups()]);
  }

  // ✅ Remplace confirm() natif
  deletePerm(row: PermissionRow): void {
    this.ui.confirm({
      title: 'Supprimer la permission',
      message: `Supprimer "${row.permission.libelle}" ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      type: 'danger',
      onConfirm: () => {
        this.permissionService.deletePermission(row.permission.id).subscribe({
          next: () => { this.loadPermissions(); this.ui.success('Permission supprimée.'); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorService.parse(err).message)
        });
      }
    });
  }

  toggleModuleMenu(group: ModuleGroup, event: Event): void {
    event.stopPropagation();
    this.moduleGroups().forEach(g => { if (g !== group) g.showMenu = false; });
    group.showMenu = !group.showMenu;
    this.moduleGroups.set([...this.moduleGroups()]);
  }

  startEditModule(group: ModuleGroup): void {
    group.editing = true; group.editName = group.module; group.showMenu = false;
    this.moduleGroups.set([...this.moduleGroups()]);
  }

  saveEditModule(group: ModuleGroup): void {
    const updates = group.rows.map(r =>
      this.permissionService.updatePermission(r.permission.id,
        { ...r.permission, module: group.editName }).toPromise()
    );
    Promise.all(updates).then(() => {
      group.editing = false;
      this.loadPermissions();
      this.ui.success('Module renommé.');
    });
  }

  cancelEditModule(group: ModuleGroup): void {
    group.editing = false; this.moduleGroups.set([...this.moduleGroups()]);
  }

  // ✅ Remplace confirm() natif
  deleteModule(group: ModuleGroup): void {
    this.ui.confirm({
      title: 'Supprimer le module',
      message: `Supprimer le module "${group.module}" et toutes ses permissions ?`,
      confirmLabel: 'Supprimer tout',
      type: 'danger',
      onConfirm: () => {
        Promise.all(group.rows.map(r =>
          this.permissionService.deletePermission(r.permission.id).toPromise()
        )).then(() => { this.loadPermissions(); this.ui.success('Module supprimé.'); });
      }
    });
  }

  // ── Profils CRUD ──
  openAddProfilModal(): void { this.showAddProfilModal.set(true); this.editingProfil.set(null); }

  openEditProfilModal(profil: Profil): void {
    this.editingProfil.set(profil);
    this.newProfilForm.set({ nom: profil.nom, description: profil.description || '', actif: profil.actif });
    this.showAddProfilModal.set(true);
  }

  closeProfilModal(): void {
    this.showAddProfilModal.set(false);
    this.editingProfil.set(null);
    this.newProfilForm.set({ nom: '', description: '', actif: true });
  }

  // ✅ Remplace confirm() natif
  deleteProfil(profil: Profil): void {
    this.ui.confirm({
      title: 'Supprimer le profil',
      message: `Supprimer le profil "${profil.nom}" ? Les utilisateurs liés perdront ce profil.`,
      confirmLabel: 'Supprimer',
      type: 'danger',
      onConfirm: () => {
        this.permissionService.deleteProfil(profil.id).subscribe({
          next: () => { this.loadProfils(); this.ui.success('Profil supprimé.'); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorService.parse(err).message)
        });
      }
    });
  }

  toggleProfilMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.showProfilMenu.set(this.showProfilMenu() === id ? null : id);
  }

  closeAllMenus(): void {
    this.moduleGroups().forEach(g => {
      g.showMenu = false;
      g.rows.forEach(r => r.showMenu = false);
    });
    this.moduleGroups.set([...this.moduleGroups()]);
    this.showProfilMenu.set(null);
  }

  // ── Soumission ──
  onSubmit(): void {
    if (this.userForm.invalid || this.loading()) return;
    this.loading.set(true);

    const selectedPerms: PermissionSelection[] = this.moduleGroups()
      .flatMap(g => g.rows).filter(r => r.selected)
      .map(r => ({
        permissionId: r.permission.id,
        canRead: true, canWrite: true, canDelete: true, canExport: true
      }));

    const request: UserCreationRequest = { ...this.userForm.value, permissions: selectedPerms };

    this.userService.createUser(request).subscribe({
      next: () => {
        // ✅ Toast succès au lieu d'alert
        this.ui.success('✅ Utilisateur créé avec succès !');
        this.loading.set(false);
        this.userForm.reset();
        this.currentStep = 1;
        this.moduleGroups().forEach(g => g.rows.forEach(r => r.selected = false));
        this.moduleGroups.set([...this.moduleGroups()]);
      },
      error: (err: HttpErrorResponse) => {
        this.ui.error(this.errorService.parse(err).message);
        this.loading.set(false);
      }
    });
  }

  saveNewPermission(): void {
    const f = this.newPermForm();
    if (!f.code || !f.libelle || !f.module) {
      this.ui.warning('Code, libellé et module sont obligatoires.');
      return;
    }
    this.permissionService.createPermission(f).subscribe({
      next: () => {
        this.closeAddPermModal();
        this.loadPermissions();
        this.ui.success('Permission créée.');
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorService.parse(err).message)
    });
  }

  saveProfil(): void {
    const f = this.newProfilForm();
    if (!f.nom) { this.ui.warning('Le nom du profil est obligatoire.'); return; }
    const editing = this.editingProfil();
    const obs = editing
      ? this.permissionService.updateProfil(editing.id, f)
      : this.permissionService.createProfil(f);
    obs.subscribe({
      next: () => {
        this.closeProfilModal();
        this.loadProfils();
        this.ui.success(editing ? 'Profil mis à jour.' : 'Profil créé.');
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorService.parse(err).message)
    });
  }
}