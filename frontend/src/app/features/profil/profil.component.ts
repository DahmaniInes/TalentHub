import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService }         from '../../services/user.service';
import { KeycloakService }     from '../../services/keycloak.service';
import { DemandeService }      from '../../services/demande.service';
import { GroupeService }       from '../../services/groupe.service';
import { ProjetService }       from '../../services/projet.service';
import { NomenclatureService } from '../../services/nomenclature.service';
import { UiService }           from '../../services/ui.service';
import { Utilisateur }         from '../../shared/models/utilisateur.model';
import { Demande, StatutDemande } from '../../shared/models/demande.model';
import { Groupe }              from '../../shared/models/groupe.model';
import { Projet }              from '../../shared/models/projet.model';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.css']
})
export class ProfilComponent implements OnInit {
  private userSvc      = inject(UserService);
  private keycloak     = inject(KeycloakService);
  private demandeSvc   = inject(DemandeService);
  private groupeSvc    = inject(GroupeService);
  private projetSvc    = inject(ProjetService);
  private nomenclature = inject(NomenclatureService);
  private ui           = inject(UiService);
  private router       = inject(Router);

  // ── State ──
  user     = signal<Utilisateur | null>(null);
  demandes = signal<Demande[]>([]);
  statuts  = signal<StatutDemande[]>([]);
  groupes  = signal<Groupe[]>([]);
  projets  = signal<Projet[]>([]);
  loading  = signal(true);
  saving   = signal(false);
  photoUploading = signal(false);

  // Onglet actif
  activeTab = signal<'infos' | 'job' | 'contact' | 'activite'>('infos');

  // Aperçu photo locale
  photoPreview = signal<string | null>(null);
  photoFile    = signal<File | null>(null);

  // Form édition (simple object — pas de FormBuilder pour éviter NG5002)
  formPrenom        = '';
  formNom           = '';
  formTelephone     = '';
  formAdresse       = '';
  formDateNaissance = '';
  formPoste         = '';
  formDepartement   = '';
  formDateFin       = '';

  // ── Computed ──
  initiales = computed(() => {
    const u = this.user();
    if (!u) return 'U';
    return `${(u.prenom || '?').charAt(0)}${(u.nom || '').charAt(0)}`.toUpperCase();
  });

  mesGroupes = computed(() => {
    const u = this.user();
    if (!u) return [];
    return this.groupes().filter(g => g.membres?.some((m: any) => m.id === u.id));
  });

  mesProjets = computed(() => {
    const u = this.user();
    if (!u) return [];
    return this.projets().filter(p =>
      p.groupes?.some((pg: any) => this.mesGroupes().some(mg => mg.id === pg.id))
    );
  });

  idEnAttente    = computed(() => this.statuts().find(s => s.code === 'EN_ATTENTE')?.id ?? -1);
  idAcceptee     = computed(() => this.statuts().find(s => s.code === 'ACCEPTEE')?.id  ?? -1);
  idRejetee      = computed(() => this.statuts().find(s => s.code === 'REJETEE')?.id   ?? -1);
  countEnAttente = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idEnAttente()).length);
  countAcceptee  = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idAcceptee()).length);
  countRejetee   = computed(() => this.demandes().filter(d => d.statutDemandeId === this.idRejetee()).length);
  derniersDemandes = computed(() => this.demandes().slice(0, 3));

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (!kcId) { this.loading.set(false); return; }

    this.nomenclature.getAllStatuts().subscribe({ next: s => this.statuts.set(s), error: () => {} });
    this.groupeSvc.getAll().subscribe({ next: g => this.groupes.set(g), error: () => {} });
    this.projetSvc.getAll().subscribe({ next: p => this.projets.set(p), error: () => {} });

    this.userSvc.getUserByKeycloakId(kcId).subscribe({
      next: (u) => {
        this.user.set(u);
        this.initFormFields(u);
        this.loading.set(false);
        this.demandeSvc.getByUtilisateur(u.id).subscribe({
          next: d => this.demandes.set(d), error: () => {}
        });
      },
      error: () => this.loading.set(false)
    });
  }

  private initFormFields(u: Utilisateur): void {
    this.formPrenom        = u.prenom || '';
    this.formNom           = u.nom || '';
    this.formTelephone     = u.telephone || '';
    this.formAdresse       = u.adresse || '';
    this.formDateNaissance = u.dateNaissance ? String(u.dateNaissance) : '';
    this.formPoste         = u.poste || '';
    this.formDepartement   = u.departement || '';
    this.formDateFin       = u.dateFinContrat ? String(u.dateFinContrat) : '';
  }

  // ── Photo ──
  onPhotoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    // Vérification taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.ui.error('La photo ne doit pas dépasser 5MB.');
      return;
    }

    this.photoFile.set(file);
    const reader = new FileReader();
    reader.onload = (e) => this.photoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  // ✅ Upload photo via multipart/form-data UNIQUEMENT
  uploadPhoto(): void {
    const file = this.photoFile();
    if (!file) return;

    this.photoUploading.set(true);
    const fd = new FormData();
    fd.append('photo', file);  // ← Le backend lit @RequestPart("photo")

    this.userSvc.updateUserProfileWithPhoto(fd).subscribe({
      next: (u: Utilisateur) => {
        this.user.set(u);
        this.photoFile.set(null);
        this.photoPreview.set(null);
        this.photoUploading.set(false);
        this.ui.success('Photo mise à jour avec succès.');
      },
      error: (err: any) => {
        this.photoUploading.set(false);
        console.error('Erreur upload photo:', err);
        this.ui.error('Erreur lors du téléchargement de la photo.');
      }
    });
  }

  cancelPhoto(): void { this.photoFile.set(null); this.photoPreview.set(null); }

  // ✅ Sauvegarde TEXTE via application/json UNIQUEMENT
  save(): void {
    this.saving.set(true);
    const updates: any = {
      prenom:      this.formPrenom,
      nom:         this.formNom,
      telephone:   this.formTelephone,
      adresse:     this.formAdresse,
      poste:       this.formPoste,
      departement: this.formDepartement,
    };
    if (this.formDateNaissance) updates.dateNaissance  = this.formDateNaissance;
    if (this.formDateFin)       updates.dateFinContrat = this.formDateFin;

    // ← Envoie JSON, PAS multipart
    this.userSvc.updateUserProfile(updates).subscribe({
      next: (u: Utilisateur) => {
        this.user.set(u);
        this.saving.set(false);
        this.ui.success('Profil mis à jour avec succès.');
      },
      error: (err: any) => {
        this.saving.set(false);
        console.error('Erreur save:', err);
        this.ui.error('Erreur lors de la mise à jour.');
      }
    });
  }

  // ── Navigation ──
  goTo(path: string): void { this.router.navigate([path]); }

  // ── Helpers ──
  fmtDate(d?: string | null): string {
    if (!d) return '—';
    try {
      const dt = new Date(d as string);
      if (isNaN(dt.getTime())) return '—';
      const m = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
      return `${String(dt.getDate()).padStart(2,'0')} ${m[dt.getMonth()]}, ${dt.getFullYear()}`;
    } catch { return '—'; }
  }

  getStatutBadgeClass(id: number): string {
    const code = this.statuts().find(s => s.id === id)?.code ?? '';
    switch (code) {
      case 'EN_ATTENTE': return 'dt-badge dt-badge-pending';
      case 'ACCEPTEE':   return 'dt-badge dt-badge-delivered';
      case 'REJETEE':    return 'dt-badge dt-badge-canceled';
      default:           return 'dt-badge dt-badge-default';
    }
  }

  getStatutLabel(id: number): string {
    return this.statuts().find(s => s.id === id)?.libelle ?? '—';
  }

  getGroupeInitiales(g: Groupe): string {
    return (g.nom || '?').substring(0, 2).toUpperCase();
  }
}