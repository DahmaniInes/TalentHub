import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { ProfilService } from '../../../services/profil.service';
import { PermissionService } from '../../../services/permission.service';
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
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private profilService = inject(ProfilService);
  private permissionService = inject(PermissionService);
  private errorService = inject(ErrorService);

  // Stepper
  steps = ['Identité', 'Poste', 'Accès', 'Récapitulatif'];
  currentStep = 1;
  focusState: Record<string, boolean> = {};

  userForm: FormGroup;

  profils = signal<Profil[]>([]);
  moduleGroups = signal<ModuleGroup[]>([]);
  loading = signal(false);
  loadingPerms = signal(false);
  success = signal(false);
  errorMessage = signal<string | null>(null);

  selectedPermsCount = computed(() =>
    this.moduleGroups().flatMap(g => g.rows).filter(r => r.selected).length
  );

  showAddPermModal = signal(false);
  showAddProfilModal = signal(false);
  newPermForm = signal({ code: '', libelle: '', module: '', description: '', actif: true });
  newProfilForm = signal({ nom: '', description: '', actif: true });
  editingProfil = signal<Profil | null>(null);
  showProfilMenu = signal<number | null>(null);

  constructor() {
    this.userForm = this.fb.group({
      nom:          ['', [Validators.required, Validators.minLength(2)]],
      prenom:       ['', [Validators.required, Validators.minLength(2)]],
      email:        ['', [Validators.required, Validators.email]],
      telephone:    [''],
     // dateEmbauche: ['', Validators.required],
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

  // Navigation
  isStepValid(): boolean {
    switch (this.currentStep) {
      case 1: return this.userForm.get('prenom')!.valid && this.userForm.get('nom')!.valid && this.userForm.get('email')!.valid;
      case 2: return this.userForm.get('dateEmbauche')!.valid;
      case 3: return this.userForm.get('profilId')!.valid;
      default: return true;
    }
  }

  nextStep(): void {
    if (!this.isStepValid()) { this.touchCurrentStep(); return; }
    if (this.currentStep < this.steps.length) this.currentStep++;
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }

  goToStep(step: number): void {
    if (step <= this.currentStep) this.currentStep = step;
  }

  private touchCurrentStep(): void {
    const stepFields: Record<number, string[]> = {
      1: ['prenom', 'nom', 'email'],
      2: ['dateEmbauche'],
      3: ['profilId'],
    };
    (stepFields[this.currentStep] || []).forEach(f => this.userForm.get(f)?.markAsTouched());
  }

  private loadProfils(): void {
    this.profilService.getAllProfils().subscribe({
      next: data => this.profils.set(data),
      error: () => this.errorMessage.set('Erreur chargement profils')
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
      map.get(mod)!.push({ permission: p, selected: false, showMenu: false, editing: false, editForm: { ...p } });
    });
    const groups: ModuleGroup[] = [];
    map.forEach((rows, module) => groups.push({ module, rows, showMenu: false, editing: false, editName: module }));
    this.moduleGroups.set(groups);
  }

  getModules(): ModuleGroup[] { return this.moduleGroups(); }

  getSelectedProfilName(): string {
    const id = this.userForm.get('profilId')?.value;
    return this.profils().find(p => p.id === id)?.nom ?? '—';
  }

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
      next: () => { row.editing = false; this.loadPermissions(); },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorService.parse(err).message)
    });
  }

  cancelEditPerm(row: PermissionRow): void { row.editing = false; this.moduleGroups.set([...this.moduleGroups()]); }

  deletePerm(row: PermissionRow): void {
    if (!confirm(`Supprimer "${row.permission.libelle}" ?`)) return;
    this.permissionService.deletePermission(row.permission.id).subscribe({
      next: () => this.loadPermissions(),
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorService.parse(err).message)
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
      this.permissionService.updatePermission(r.permission.id, { ...r.permission, module: group.editName }).toPromise()
    );
    Promise.all(updates).then(() => { group.editing = false; this.loadPermissions(); });
  }

  cancelEditModule(group: ModuleGroup): void { group.editing = false; this.moduleGroups.set([...this.moduleGroups()]); }

  deleteModule(group: ModuleGroup): void {
    if (!confirm(`Supprimer le module "${group.module}" ?`)) return;
    Promise.all(group.rows.map(r => this.permissionService.deletePermission(r.permission.id).toPromise()))
      .then(() => this.loadPermissions());
  }

  openAddProfilModal(): void { this.showAddProfilModal.set(true); this.editingProfil.set(null); }

  openEditProfilModal(profil: Profil): void {
    this.editingProfil.set(profil);
    this.newProfilForm.set({ nom: profil.nom, description: profil.description || '', actif: profil.actif });
    this.showAddProfilModal.set(true);
  }

  closeProfilModal(): void {
    this.showAddProfilModal.set(false); this.editingProfil.set(null);
    this.newProfilForm.set({ nom: '', description: '', actif: true });
  }

  deleteProfil(profil: Profil): void {
    if (!confirm(`Supprimer le profil "${profil.nom}" ?`)) return;
    this.permissionService.deleteProfil(profil.id).subscribe({
      next: () => this.loadProfils(),
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorService.parse(err).message)
    });
  }

  toggleProfilMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.showProfilMenu.set(this.showProfilMenu() === id ? null : id);
  }

  closeAllMenus(): void {
    this.moduleGroups().forEach(g => { g.showMenu = false; g.rows.forEach(r => r.showMenu = false); });
    this.moduleGroups.set([...this.moduleGroups()]);
    this.showProfilMenu.set(null);
  }

  onSubmit(): void {
    if (this.userForm.invalid || this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.success.set(false);

    const selectedPerms: PermissionSelection[] = this.moduleGroups()
      .flatMap(g => g.rows).filter(r => r.selected)
      .map(r => ({ permissionId: r.permission.id, canRead: true, canWrite: true, canDelete: true, canExport: true }));

    const request: UserCreationRequest = { ...this.userForm.value, permissions: selectedPerms };

    this.userService.createUser(request).subscribe({
      next: () => {
        this.success.set(true); this.loading.set(false);
        this.userForm.reset(); this.currentStep = 1;
        this.moduleGroups().forEach(g => g.rows.forEach(r => r.selected = false));
        this.moduleGroups.set([...this.moduleGroups()]);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(this.errorService.parse(err).message);
        this.loading.set(false);
      }
    });
  }

  saveNewPermission(): void {
    const f = this.newPermForm();
    if (!f.code || !f.libelle || !f.module) { this.errorMessage.set('Code, libellé et module requis.'); return; }
    this.permissionService.createPermission(f).subscribe({
      next: () => { this.closeAddPermModal(); this.loadPermissions(); },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorService.parse(err).message)
    });
  }

  saveProfil(): void {
    const f = this.newProfilForm();
    if (!f.nom) { this.errorMessage.set('Le nom du profil est obligatoire.'); return; }
    const editing = this.editingProfil();
    const obs = editing ? this.permissionService.updateProfil(editing.id, f) : this.permissionService.createProfil(f);
    obs.subscribe({
      next: () => { this.closeProfilModal(); this.loadProfils(); },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorService.parse(err).message)
    });
  }



}