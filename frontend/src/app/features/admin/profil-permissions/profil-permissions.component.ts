// src/app/features/admin/profil-permissions/profil-permissions.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PermissionService, ProfilPermission, AssignPermissionRequest } from '../../../services/permission.service';
import { UserService } from '../../../services/user.service';
import { UiService } from '../../../services/ui.service';
import { ErrorService } from '../../../services/error.service';
import { Permission } from '../../../shared/models/permission.model';
import { Profil } from '../../../shared/models/profil.model';
import { HttpErrorResponse } from '@angular/common/http';
import { Utilisateur } from '../../../shared/models/utilisateur.model';

export interface MatrixCell {
  assigned: boolean;
  profilPermId?: number;
  saving: boolean;
}

export interface MatrixRow {
  permission: Permission;
  cells: MatrixCell[];
}

export interface ModuleSection {
  module: string;
  rows: MatrixRow[];
  allAssigned: boolean[];
  collapsed: boolean;
}

@Component({
  selector: 'app-profil-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profil-permissions.component.html',
  styleUrls: ['./profil-permissions.component.css']
})
export class ProfilPermissionsComponent implements OnInit {
  private permSvc  = inject(PermissionService);
  private userSvc  = inject(UserService);
  private errorSvc = inject(ErrorService);
  readonly ui      = inject(UiService);

  profils      = signal<Profil[]>([]);
  permissions  = signal<Permission[]>([]);
  utilisateurs = signal<Utilisateur[]>([]);
  sections     = signal<ModuleSection[]>([]);
  loading      = signal(true);

  // Modals
  showProfilModal        = signal(false);
  showPermModal          = signal(false);
  showAddToModuleModal   = signal(false);
  editingProfil          = signal<Profil | null>(null);
  editingPerm            = signal<Permission | null>(null);
  addToModuleName        = signal('');

  // Formulaires
  profilForm       = signal({ nom: '', description: '', actif: true });
  permForm         = signal({ code: '', libelle: '', module: '', description: '', actif: true });
  addToModuleForm  = signal({ code: '', libelle: '', description: '', actif: true });

  // Stats
  totalUsers    = computed(() => this.utilisateurs().length);
  usersByProfil = computed(() => {
    const counts: Record<number, number> = {};
    this.utilisateurs().forEach(u => {
      if (u.profilId) counts[u.profilId] = (counts[u.profilId] || 0) + 1;
    });
    return counts;
  });

  ngOnInit(): void { this.loadAll(); }

  // ── Chargement ──
  loadAll(): void {
    this.loading.set(true);
    let done = 0;
    const check = () => { if (++done === 3) this.buildMatrix(); };

    this.permSvc.getAllProfils().subscribe({
      next: d => { this.profils.set(d); check(); },
      error: () => { this.ui.error('Erreur chargement profils.'); check(); }
    });
    this.permSvc.getAllPermissions().subscribe({
      next: d => { this.permissions.set(d); check(); },
      error: () => { this.ui.error('Erreur chargement permissions.'); check(); }
    });
    this.userSvc.getAllUsers().subscribe({
      next: d => { this.utilisateurs.set(d); check(); },
      error: () => { check(); }
    });
  }

  // ── Construction matrice — ✅ corrigé : cells toujours alignées avec profils[] ──
  private buildMatrix(): void {
    const profils = this.profils();
    const perms   = this.permissions();

    if (perms.length === 0) {
      this.sections.set([]);
      this.loading.set(false);
      return;
    }

    const promises = profils.map(p =>
      this.permSvc.getByProfil(p.id).toPromise().catch(() => [] as ProfilPermission[])
    );

    Promise.all(promises).then(allPP => {
      const map = new Map<string, ModuleSection>();

      perms.forEach(perm => {
        const mod = perm.module || 'AUTRE';
        if (!map.has(mod)) {
          map.set(mod, {
            module: mod,
            rows: [],
            // ✅ allAssigned a exactement profils.length entrées
            allAssigned: profils.map(() => false),
            collapsed: false
          });
        }

        // ✅ cells a exactement profils.length entrées — garanti
        const cells: MatrixCell[] = profils.map((_, profilIdx) => {
          const pp = allPP[profilIdx]?.find(x => x.permissionId === perm.id);
          return {
            assigned:     !!pp,
            profilPermId: pp?.id,
            saving:       false
          };
        });

        map.get(mod)!.rows.push({ permission: perm, cells });
      });

      // Calculer allAssigned
      map.forEach(section => {
        section.allAssigned = profils.map((_, pi) =>
          section.rows.length > 0 && section.rows.every(r => r.cells[pi]?.assigned === true)
        );
      });

      this.sections.set(
        Array.from(map.values()).sort((a, b) => a.module.localeCompare(b.module))
      );
      this.loading.set(false);
    });
  }

  // ── Toggle cellule ──
  toggleCell(section: ModuleSection, row: MatrixRow, profilIdx: number): void {
    // ✅ Vérification défensive
    if (!row.cells[profilIdx]) return;
    const cell   = row.cells[profilIdx];
    const profil = this.profils()[profilIdx];
    if (!profil || cell.saving) return;

    cell.saving = true;
    this.sections.set([...this.sections()]);

    if (cell.assigned && cell.profilPermId) {
      this.permSvc.removeProfilPermission(cell.profilPermId).subscribe({
        next: () => {
          cell.assigned = false; cell.profilPermId = undefined; cell.saving = false;
          this.updateAllAssigned(section, profilIdx);
          this.sections.set([...this.sections()]);
        },
        error: (err: HttpErrorResponse) => {
          cell.saving = false;
          this.sections.set([...this.sections()]);
          this.ui.error(this.errorSvc.parse(err).message);
        }
      });
    } else if (!cell.assigned) {
      const req: AssignPermissionRequest = {
        profilId: profil.id, permissionId: row.permission.id,
        canRead: true, canWrite: true, canDelete: false, canExport: false
      };
      this.permSvc.assignPermission(req).subscribe({
        next: (pp) => {
          cell.assigned = true; cell.profilPermId = pp.id; cell.saving = false;
          this.updateAllAssigned(section, profilIdx);
          this.sections.set([...this.sections()]);
        },
        error: (err: HttpErrorResponse) => {
          cell.saving = false;
          this.sections.set([...this.sections()]);
          this.ui.error(this.errorSvc.parse(err).message);
        }
      });
    }
  }

  // ── Toggle module entier pour un profil ──
  toggleModuleForProfil(section: ModuleSection, profilIdx: number): void {
    const profil   = this.profils()[profilIdx];
    if (!profil) return;
    const newState = !section.allAssigned[profilIdx];

    const ops = section.rows.map(row => {
      const cell = row.cells[profilIdx];
      if (!cell) return Promise.resolve();
      if (newState && !cell.assigned) {
        return this.permSvc.assignPermission({
          profilId: profil.id, permissionId: row.permission.id,
          canRead: true, canWrite: true, canDelete: false, canExport: false
        }).toPromise().then(pp => { cell.assigned = true; cell.profilPermId = pp?.id; });
      } else if (!newState && cell.assigned && cell.profilPermId) {
        return this.permSvc.removeProfilPermission(cell.profilPermId).toPromise()
          .then(() => { cell.assigned = false; cell.profilPermId = undefined; });
      }
      return Promise.resolve();
    });

    Promise.all(ops).then(() => {
      section.allAssigned[profilIdx] = newState;
      this.sections.set([...this.sections()]);
      this.ui.success(newState
        ? `Module "${section.module}" assigné à ${profil.nom}.`
        : `Module "${section.module}" retiré de ${profil.nom}.`
      );
    }).catch(() => this.ui.error('Une erreur est survenue.'));
  }

  private updateAllAssigned(section: ModuleSection, profilIdx: number): void {
    section.allAssigned[profilIdx] =
      section.rows.length > 0 &&
      section.rows.every(r => r.cells[profilIdx]?.assigned === true);
  }

  toggleCollapse(section: ModuleSection): void {
    section.collapsed = !section.collapsed;
    this.sections.set([...this.sections()]);
  }

  // ── CRUD Profils ──
  openAddProfil(): void {
    this.editingProfil.set(null);
    this.profilForm.set({ nom: '', description: '', actif: true });
    this.showProfilModal.set(true);
  }

  openEditProfil(profil: Profil): void {
    this.editingProfil.set(profil);
    this.profilForm.set({ nom: profil.nom, description: profil.description || '', actif: profil.actif });
    this.showProfilModal.set(true);
  }

  saveProfil(): void {
    const f = this.profilForm();
    if (!f.nom.trim()) { this.ui.warning('Le nom est obligatoire.'); return; }
    const editing = this.editingProfil();
    const obs = editing ? this.permSvc.updateProfil(editing.id, f) : this.permSvc.createProfil(f);
    obs.subscribe({
      next: () => {
        this.ui.success(editing ? 'Profil mis à jour.' : 'Profil créé.');
        this.closeProfilModal();
        this.loadAll();
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  deleteProfil(profil: Profil): void {
    this.ui.confirm({
      title: 'Supprimer le profil',
      message: `Supprimer "${profil.nom}" ? Toutes ses permissions seront perdues.`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        this.permSvc.deleteProfil(profil.id).subscribe({
          next: () => { this.ui.success('Profil supprimé.'); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  closeProfilModal(): void { this.showProfilModal.set(false); this.editingProfil.set(null); }

  // ── CRUD Permissions ──
  openAddPerm(): void {
    this.editingPerm.set(null);
    this.permForm.set({ code: '', libelle: '', module: '', description: '', actif: true });
    this.showPermModal.set(true);
  }

  openEditPerm(perm: Permission): void {
    this.editingPerm.set(perm);
    this.permForm.set({
      code: perm.code || '', libelle: perm.libelle,
      module: perm.module || '', description: perm.description || '', actif: perm.actif ?? true
    });
    this.showPermModal.set(true);
  }

  savePerm(): void {
    const f = this.permForm();
    if (!f.libelle.trim() || !f.module.trim()) { this.ui.warning('Libellé et module requis.'); return; }
    const editing = this.editingPerm();
    const obs = editing
      ? this.permSvc.updatePermission(editing.id, f)
      : this.permSvc.createPermission(f);
    obs.subscribe({
      next: () => { this.ui.success(editing ? 'Permission mise à jour.' : 'Permission créée.'); this.closePermModal(); this.loadAll(); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  deletePerm(perm: Permission): void {
    this.ui.confirm({
      title: 'Supprimer la permission',
      message: `Supprimer "${perm.libelle}" ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        this.permSvc.deletePermission(perm.id).subscribe({
          next: () => { this.ui.success('Permission supprimée.'); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  closePermModal(): void { this.showPermModal.set(false); this.editingPerm.set(null); }

  // ── Ajout dans module ──
  openAddToModule(moduleName: string): void {
    this.addToModuleName.set(moduleName);
    this.addToModuleForm.set({ code: '', libelle: '', description: '', actif: true });
    this.showAddToModuleModal.set(true);
  }

  saveAddToModule(): void {
    const f = this.addToModuleForm();
    if (!f.libelle.trim()) { this.ui.warning('Le libellé est obligatoire.'); return; }
    this.permSvc.createPermission({ ...f, module: this.addToModuleName() }).subscribe({
      next: () => {
        this.ui.success(`Permission ajoutée au module "${this.addToModuleName()}".`);
        this.showAddToModuleModal.set(false);
        this.loadAll();
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  closeAddToModuleModal(): void { this.showAddToModuleModal.set(false); }
}