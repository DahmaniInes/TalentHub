import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StagiaireService }         from '../../../services/stagiaire.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { UiService }                from '../../../services/ui.service';

@Component({
  selector: 'app-type-stage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './type-stage.component.html'
})
export class TypeStageComponent implements OnInit {
  private svc    = inject(StagiaireService);
  readonly perms = inject(PermissionContextService);
  readonly ui    = inject(UiService);

  types    = signal<any[]>([]);
  loading  = signal(false);
  search   = signal('');
  slideOpen   = signal(false);
  editingId   = signal<number | null>(null);
  form        = signal<any>({ code:'', libelle:'', description:'', dureeMinSemaines: null, dureeMaxSemaines: null, actif: true });

  filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.types().filter(t =>
      !q || t.libelle.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
  });

  countActifs = computed(() => this.types().filter(t => t.actif).length);

  ngOnInit(): void {
    this.loadTypes();
  }

  loadTypes(): void {
    this.loading.set(true);
    this.svc.getTypesStage().subscribe({ next: d => { this.types.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  openCreate(): void { this.editingId.set(null); this.form.set({ code:'', libelle:'', description:'', dureeMinSemaines: null, dureeMaxSemaines: null, actif: true }); this.slideOpen.set(true); }

  openEdit(t: any): void { this.editingId.set(t.id); this.form.set({ ...t }); this.slideOpen.set(true); }

  closeSlide(): void { this.slideOpen.set(false); }

  save(): void {
    const f = this.form();
    if (!f.libelle?.trim()) { this.ui.warning('Le libellé est obligatoire.'); return; }
    this.loading.set(true);
    const obs = this.editingId()
      ? this.svc.updateTypeStage(this.editingId()!, f)
      : this.svc.createTypeStage(f);
    obs.subscribe({
      next: () => { this.loadTypes(); this.slideOpen.set(false); this.ui.success(this.editingId() ? 'Type mis à jour ✅' : 'Type créé ✅'); },
      error: () => { this.loading.set(false); this.ui.error('Erreur lors de la sauvegarde.'); }
    });
  }

  toggleActif(t: any): void {
    this.svc.toggleTypeStage(t.id, !t.actif).subscribe({ next: () => this.loadTypes() });
  }

  delete(t: any): void {
    this.ui.confirm({ title: 'Supprimer', message: `Supprimer "${t.libelle}" ?`, confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => this.svc.deleteTypeStage(t.id).subscribe({ next: () => { this.loadTypes(); this.ui.success('Supprimé.'); } })
    });
  }
}