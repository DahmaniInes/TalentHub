// src/app/features/approbation-feuille-temps/approbation-feuille-temps.component.ts
// ✅ Version corrigée — utilise les nouveaux champs du modèle LigneFeuilleTemps
// Changements :
//   - minutesNormales     → minutesTravaillees
//   - minutesAbsence      → supprimé (n'existe plus)
//   - categorieCode       → projetNom / activiteNom
//   - CategorieFT         → supprimé
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { FeuilleTempsService } from '../../../services/feuille-temps.service';
import { UserService }         from '../../../services/user.service';
import { KeycloakService }     from '../../../services/keycloak.service';
import { ErrorService }        from '../../../services/error.service';
import { UiService }           from '../../../services/ui.service';
import { FeuilleTemps, LigneFeuilleTemps } from '../../../shared/models/feuille-temps.model';
import { Utilisateur } from '../../../shared/models/utilisateur.model';

@Component({
  selector: 'app-approbation-feuille-temps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approbation-feuille-temps.component.html',
  styleUrls: ['./approbation-feuille-temps.component.css']
})
export class ApprobationFeuilleTempsComponent implements OnInit {
  private ftSvc    = inject(FeuilleTempsService);
  private userSvc  = inject(UserService);
  private keycloak = inject(KeycloakService);
  private errorSvc = inject(ErrorService);
  readonly ui      = inject(UiService);

  feuilles      = signal<FeuilleTemps[]>([]);
  feuilleDetail = signal<FeuilleTemps | null>(null);
  currentKcId   = signal<string>('');
  loading       = signal(false);
  motifRejet    = '';
  showRejetModal = signal(false);
  filterStatut  = signal('SOUMISE');
  searchText    = signal('');

  filteredFeuilles = computed(() => {
    let list = this.feuilles();
    const q  = this.searchText().toLowerCase();
    if (this.filterStatut() && this.filterStatut() !== 'TOUS')
      list = list.filter(f => f.statut === this.filterStatut());
    if (q) list = list.filter(f =>
      (f.utilisateurNom || '').toLowerCase().includes(q) || f.semaineDu.includes(q));
    return list;
  });

  readonly fmt = FeuilleTempsService.formatMinutes;

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) this.currentKcId.set(kcId);
    this.loadFeuilles();
  }

  loadFeuilles(): void {
    this.loading.set(true);
    this.ftSvc.getSoumises().subscribe({
      next: d => { this.feuilles.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  ouvrirDetail(ft: FeuilleTemps): void {
    this.feuilleDetail.set(ft);
  }

  fermerDetail(): void { this.feuilleDetail.set(null); }

  valider(ft: FeuilleTemps): void {
    this.ui.confirm({
      title: 'Valider la feuille',
      message: `Valider la feuille de ${ft.utilisateurNom} du ${ft.semaineDu} ?`,
      confirmLabel: 'Valider', type: 'info',
      onConfirm: () => {
        this.ftSvc.valider(ft.id, this.currentKcId(), '').subscribe({
          next: updated => {
            this.feuilles.update(fts => fts.map(f => f.id === updated.id ? updated : f));
            if (this.feuilleDetail()?.id === ft.id) this.feuilleDetail.set(updated);
            this.ui.success('Feuille validée ✅');
          },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  ouvrirRejet(ft: FeuilleTemps): void {
    this.feuilleDetail.set(ft);
    this.motifRejet = '';
    this.showRejetModal.set(true);
  }

  confirmerRejet(): void {
    const ft = this.feuilleDetail();
    if (!ft) return;
    if (!this.motifRejet.trim()) { this.ui.warning('Le motif est obligatoire.'); return; }
    this.ftSvc.rejeter(ft.id, this.currentKcId(), this.motifRejet).subscribe({
      next: updated => {
        this.feuilles.update(fts => fts.map(f => f.id === updated.id ? updated : f));
        this.feuilleDetail.set(updated);
        this.showRejetModal.set(false);
        this.ui.success('Feuille rejetée.');
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  // ✅ CORRIGÉ — utilise minutesTravaillees au lieu de minutesNormales + minutesAbsence
  totalLigne(l: LigneFeuilleTemps): number {
    return l.minutesTravaillees + l.minutesSupplementaires;
  }

  statutColor(s: string): string {
    return ({ BROUILLON:'gray', SOUMISE:'blue', VALIDEE:'green', REJETEE:'red' } as any)[s] ?? 'gray';
  }
  statutLabel(s: string): string {
    return ({ BROUILLON:'Brouillon', SOUMISE:'Soumise', VALIDEE:'Validée', REJETEE:'Rejetée' } as any)[s] ?? s;
  }
  statutIcon(s: string): string {
    return ({ BROUILLON:'✏️', SOUMISE:'⏳', VALIDEE:'✅', REJETEE:'❌' } as any)[s] ?? '📄';
  }
}