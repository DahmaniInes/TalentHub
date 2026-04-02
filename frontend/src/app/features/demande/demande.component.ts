import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DemandeService } from '../../services/demande.service';
import { NomenclatureService } from '../../services/nomenclature.service';
import { UserService } from '../../services/user.service';
import { KeycloakService } from '../../services/keycloak.service';
import { ErrorService } from '../../services/error.service';
import { Demande, DemandeRequest, TypeDemande, StatutDemande } from '../../shared/models/demande.model';
import { Utilisateur } from '../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';

type ModalMode = 'demande' | 'type' | 'statut' | null;

@Component({
  selector: 'app-demande',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './demande.component.html',
  styleUrls: ['./demande.component.css']
})
export class DemandeComponent implements OnInit {
  private demandeService  = inject(DemandeService);
  private nomenclature    = inject(NomenclatureService);
  private userService     = inject(UserService);
  private keycloak        = inject(KeycloakService);
  private errorSvc        = inject(ErrorService);
  private fb              = inject(FormBuilder);

  // ── State ──
  demandes       = signal<Demande[]>([]);
  types          = signal<TypeDemande[]>([]);
  statuts        = signal<StatutDemande[]>([]);
  utilisateurs   = signal<Utilisateur[]>([]);
  loading        = signal(false);
  errorMessage   = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  activeTab      = signal<'demandes' | 'types' | 'statuts'>('demandes');
  modalMode      = signal<ModalMode>(null);
  editingId      = signal<number | null>(null);
  filterStatutId = signal<number | null>(null);
  filterTypeId   = signal<number | null>(null);
  currentUserId  = signal<number | null>(null);

  // ── Computed ──
  filteredDemandes = computed(() => {
    let list = this.demandes();
    if (this.filterStatutId()) list = list.filter(d => d.statutDemandeId === this.filterStatutId());
    if (this.filterTypeId())   list = list.filter(d => d.typeDemandeId === this.filterTypeId());
    return list;
  });

  countByStatut(id: number): number {
    return this.demandes().filter(d => d.statutDemandeId === id).length;
  }

  // ── Formulaires ──
  demandeForm: FormGroup;
  typeForm: FormGroup;
  statutForm: FormGroup;

  constructor() {
    this.demandeForm = this.fb.group({
      utilisateurId:  [null, Validators.required],
      typeDemandeId:  [null, Validators.required],
      statutDemandeId:[null],
      sujet:          ['', [Validators.required, Validators.minLength(3)]],
      description:    [''],
      dateDebut:      [null],
      dateFin:        [null],
      nbJours:        [null],
      commentaireRH:  ['']
    });

    // Auto-calcul nbJours
    this.demandeForm.get('dateDebut')!.valueChanges.subscribe(() => this.calcNbJours());
    this.demandeForm.get('dateFin')!.valueChanges.subscribe(() => this.calcNbJours());

    this.typeForm = this.fb.group({
      code:        ['', Validators.required],
      libelle:     ['', Validators.required],
      description: [''],
      actif:       [true]
    });

    this.statutForm = this.fb.group({
      code:    ['', Validators.required],
      libelle: ['', Validators.required],
      couleur: ['#6b7280'],
      actif:   [true]
    });
  }

  ngOnInit(): void {
    this.loadNomenclature();  // ✅ Séparé du chargement utilisateur
    this.loadUtilisateurs();
    this.loadDemandesWithFallback();
  }
  
  // ✅ Charger nomenclature indépendamment
  private loadNomenclature(): void {
    this.nomenclature.getAllTypes().subscribe({
      next: t => this.types.set(t),
      error: () => console.warn('Erreur chargement types — vérifiez que nomenclature-service tourne')
    });
    this.nomenclature.getAllStatuts().subscribe({
      next: s => this.statuts.set(s),
      error: () => console.warn('Erreur chargement statuts')
    });
  }
  
  private loadUtilisateurs(): void {
    this.userService.getAllUsers().subscribe({
      next: u => this.utilisateurs.set(u),
      error: () => {}
    });
  }
  
  // ✅ Charger les demandes avec fallback si utilisateur non trouvé en base
  private loadDemandesWithFallback(): void {
    this.loading.set(true);
    const kcId = this.keycloak.getKeycloakUserId();
  
    if (!kcId) {
      // Pas de session Keycloak — charger toutes les demandes
      this.loadAllDemandes();
      return;
    }
  
    this.userService.getUserByKeycloakId(kcId).subscribe({
      next: (u: Utilisateur) => {
        this.currentUserId.set(u.id);
        this.demandeForm.get('utilisateurId')!.setValue(u.id);
        // Charger les demandes de cet utilisateur
        this.demandeService.getByUtilisateur(u.id).subscribe({
          next: d => { this.demandes.set(d); this.loading.set(false); },
          error: () => { this.loading.set(false); }
        });
      },
      error: (err) => {
        if (err.status === 404) {
          // ✅ Utilisateur pas encore créé en base — c'est normal pour un nouveau compte
          console.info('Utilisateur non trouvé en base, affichage vide.');
          this.demandes.set([]);
          this.loading.set(false);
        } else {
          // Autre erreur — fallback sur toutes les demandes
          this.loadAllDemandes();
        }
      }
    });
  }
  
  private loadAllDemandes(): void {
    this.demandeService.getAll().subscribe({
      next: d => { this.demandes.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }
  
  // ✅ Remplacer loadAll par cette version
  private loadAll(): void {
    this.loadNomenclature();
    this.loadUtilisateurs();
    this.loadDemandesWithFallback();
  }

  

  private calcNbJours(): void {
    const debut = this.demandeForm.get('dateDebut')?.value;
    const fin   = this.demandeForm.get('dateFin')?.value;
    if (debut && fin) {
      const d1 = new Date(debut);
      const d2 = new Date(fin);
      const diff = Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
      this.demandeForm.get('nbJours')!.setValue(diff, { emitEvent: false });
    }
  }

  // ── CRUD Demandes ──
  openCreateDemande(): void {
    this.editingId.set(null);
    this.demandeForm.reset({ utilisateurId: this.currentUserId(), actif: true });
    this.errorMessage.set(null);
    this.modalMode.set('demande');
  }

  openEditDemande(d: Demande): void {
    this.editingId.set(d.id);
    this.demandeForm.patchValue({ ...d });
    this.errorMessage.set(null);
    this.modalMode.set('demande');
  }

  saveDemande(): void {
    if (this.demandeForm.invalid) { this.errorMessage.set('Champs obligatoires manquants.'); return; }
    this.loading.set(true);
    const req: DemandeRequest = this.demandeForm.value;
    const id = this.editingId();
    const obs = id ? this.demandeService.update(id, req) : this.demandeService.create(req);
    obs.subscribe({
      next: () => {
        this.modalMode.set(null);
        this.successMessage.set(id ? 'Demande modifiée.' : 'Demande créée.');
        this.loadAll();
        this.loading.set(false);
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(this.errorSvc.parse(err).message);
        this.loading.set(false);
      }
    });
  }

  deleteDemande(d: Demande): void {
    if (!confirm(`Supprimer la demande "${d.sujet}" ?`)) return;
    this.demandeService.delete(d.id).subscribe({
      next: () => { this.successMessage.set('Demande supprimée.'); this.loadAll(); },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorSvc.parse(err).message)
    });
  }

  // ── CRUD Types ──
  openCreateType(): void {
    this.editingId.set(null);
    this.typeForm.reset({ actif: true });
    this.modalMode.set('type');
  }

  openEditType(t: TypeDemande): void {
    this.editingId.set(t.id);
    this.typeForm.patchValue(t);
    this.modalMode.set('type');
  }

  saveType(): void {
    if (this.typeForm.invalid) return;
    const id = this.editingId();
    const obs = id
      ? this.nomenclature.updateType(id, this.typeForm.value)
      : this.nomenclature.createType(this.typeForm.value);
    obs.subscribe({
      next: () => {
        this.modalMode.set(null);
        this.successMessage.set(id ? 'Type modifié.' : 'Type créé.');
        this.nomenclature.getAllTypes().subscribe(t => this.types.set(t));
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorSvc.parse(err).message)
    });
  }

  deleteType(t: TypeDemande): void {
    if (!confirm(`Supprimer le type "${t.libelle}" ?`)) return;
    this.nomenclature.deleteType(t.id).subscribe({
      next: () => { this.nomenclature.getAllTypes().subscribe(ts => this.types.set(ts)); },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorSvc.parse(err).message)
    });
  }

  // ── CRUD Statuts ──
  openCreateStatut(): void {
    this.editingId.set(null);
    this.statutForm.reset({ couleur: '#6b7280', actif: true });
    this.modalMode.set('statut');
  }

  openEditStatut(s: StatutDemande): void {
    this.editingId.set(s.id);
    this.statutForm.patchValue(s);
    this.modalMode.set('statut');
  }

  saveStatut(): void {
    if (this.statutForm.invalid) return;
    const id = this.editingId();
    const obs = id
      ? this.nomenclature.updateStatut(id, this.statutForm.value)
      : this.nomenclature.createStatut(this.statutForm.value);
    obs.subscribe({
      next: () => {
        this.modalMode.set(null);
        this.successMessage.set(id ? 'Statut modifié.' : 'Statut créé.');
        this.nomenclature.getAllStatuts().subscribe(s => this.statuts.set(s));
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorSvc.parse(err).message)
    });
  }

  deleteStatut(s: StatutDemande): void {
    if (!confirm(`Supprimer le statut "${s.libelle}" ?`)) return;
    this.nomenclature.deleteStatut(s.id).subscribe({
      next: () => { this.nomenclature.getAllStatuts().subscribe(ss => this.statuts.set(ss)); },
      error: (err: HttpErrorResponse) => this.errorMessage.set(this.errorSvc.parse(err).message)
    });
  }

  // ── Helpers ──
  getTypeName(id: number): string {
    return this.types().find(t => t.id === id)?.libelle ?? '—';
  }

  getStatut(id: number): StatutDemande | undefined {
    return this.statuts().find(s => s.id === id);
  }

  closeModal(): void { this.modalMode.set(null); this.errorMessage.set(null); }
}