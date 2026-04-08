// src/app/features/approbation-feuille-temps/approbation-feuille-temps.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FeuilleTempsService } from '../../services/feuille-temps.service';
import { KeycloakService } from '../../services/keycloak.service';
import { ErrorService } from '../../services/error.service';
import { UiService } from '../../services/ui.service';
import { FeuilleTemps, LigneFeuilleTemps } from '../../shared/models/feuille-temps.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-approbation-feuille-temps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approbation-feuille-temps.component.html',
  styleUrls: ['./approbation-feuille-temps.component.css']
})
export class ApprobationFeuilleTempsComponent implements OnInit {
  private ftService  = inject(FeuilleTempsService);
  private keycloak   = inject(KeycloakService);
  private errorSvc   = inject(ErrorService);
  private router     = inject(Router);
  readonly ui        = inject(UiService);

  feuilles        = signal<FeuilleTemps[]>([]);
  loading         = signal(false);
  activeView      = signal<'liste' | 'detail'>('liste');
  feuilleDetail   = signal<FeuilleTemps | null>(null);
  commentaireAction = '';
  actionLoading   = signal(false);

  filtreUser   = '';
  filtreDate   = '';
  filtreStatut = 'SOUMISE';   // par défaut : En attente

  readonly categories = [
    { code: 'TRAVAIL', label: 'Travail',  couleur: '#3b82f6', icon: '💼' },
    { code: 'CONGE',   label: 'Congé',    couleur: '#f59e0b', icon: '🏖️' },
    { code: 'MALADIE', label: 'Maladie',  couleur: '#ef4444', icon: '🤒' },
    { code: 'FERIE',   label: 'Férié',    couleur: '#8b5cf6', icon: '🎉' },
    { code: 'AUTRE',   label: 'Autre',    couleur: '#6b7280', icon: '📌' }
  ];

  readonly joursSemaine = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

  ngOnInit(): void { this.loadFeuilles(); }

  loadFeuilles(): void {
    this.loading.set(true);
    this.ftService.getSoumises().subscribe({
      next: fts => { this.feuilles.set(fts); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  get feuillesFiltrees(): FeuilleTemps[] {
    return this.feuilles().filter(ft => {
      const matchStatut = this.filtreStatut === 'TOUS' || ft.statut === this.filtreStatut;
      const matchUser   = !this.filtreUser ||
        (ft.utilisateurNom ?? '').toLowerCase().includes(this.filtreUser.toLowerCase());
      const matchDate   = !this.filtreDate ||
        ft.semaineDu.startsWith(this.filtreDate.substring(0, 7));
      return matchStatut && matchUser && matchDate;
    });
  }

  get countEnAttente(): number { return this.feuilles().filter(f => f.statut === 'SOUMISE').length; }
  get countValidees(): number  { return this.feuilles().filter(f => f.statut === 'VALIDEE').length; }
  get countRejetees(): number  { return this.feuilles().filter(f => f.statut === 'REJETEE').length; }

  ouvrirDetail(ft: FeuilleTemps): void {
    this.feuilleDetail.set(ft);
    this.commentaireAction = '';
    this.activeView.set('detail');
  }

  retourListe(): void {
    this.activeView.set('liste');
    this.feuilleDetail.set(null);
  }

  retourFeuillesTemps(): void { this.router.navigate(['/feuille-temps']); }

  validerFeuille(): void {
    const ft = this.feuilleDetail();
    if (!ft) return;
    const kcId = this.keycloak.getKeycloakUserId() ?? '';

    this.ui.confirm({
      title: 'Valider la feuille de temps',
      message: `Valider la feuille de ${ft.utilisateurNom} pour la semaine du ${this.formatDateLong(ft.semaineDu)} ?`,
      confirmLabel: '✅ Valider',
      cancelLabel: 'Annuler',
      type: 'info',
      onConfirm: () => {
        this.actionLoading.set(true);
        this.ftService.valider(ft.id, kcId, this.commentaireAction).subscribe({
          next: () => {
            this.ui.success(`✅ Feuille de ${ft.utilisateurNom} validée avec succès.`);
            this.actionLoading.set(false);
            this.retourListe();
            this.loadFeuilles();
          },
          error: (err: HttpErrorResponse) => {
            this.ui.error(this.errorSvc.parse(err).message);
            this.actionLoading.set(false);
          }
        });
      }
    });
  }

  rejeterFeuille(): void {
    const ft = this.feuilleDetail();
    if (!ft) return;
    if (!this.commentaireAction.trim()) {
      this.ui.warning('⚠️ Un motif de rejet est obligatoire.');
      return;
    }
    const kcId = this.keycloak.getKeycloakUserId() ?? '';

    this.ui.confirm({
      title: 'Rejeter la feuille de temps',
      message: `Rejeter la feuille de ${ft.utilisateurNom} ? L'employé sera notifié avec votre motif.`,
      confirmLabel: '❌ Rejeter',
      cancelLabel: 'Annuler',
      type: 'danger',
      onConfirm: () => {
        this.actionLoading.set(true);
        this.ftService.rejeter(ft.id, kcId, this.commentaireAction).subscribe({
          next: () => {
            this.ui.success(`❌ Feuille de ${ft.utilisateurNom} rejetée.`);
            this.actionLoading.set(false);
            this.retourListe();
            this.loadFeuilles();
          },
          error: (err: HttpErrorResponse) => {
            this.ui.error(this.errorSvc.parse(err).message);
            this.actionLoading.set(false);
          }
        });
      }
    });
  }

  // ── Helpers ──
  statutColor(s: string): string {
    return { BROUILLON: 'gray', SOUMISE: 'blue', VALIDEE: 'green', REJETEE: 'red' }[s] ?? 'gray';
  }

  statutLabel(s: string): string {
    return { BROUILLON: 'Brouillon', SOUMISE: 'En attente', VALIDEE: 'Validée', REJETEE: 'Rejetée' }[s] ?? s;
  }

  getCatCouleur(code: string): string {
    return this.categories.find(c => c.code === code)?.couleur ?? '#6b7280';
  }

  getCatLabel(code: string): string {
    return this.categories.find(c => c.code === code)?.label ?? code;
  }

  jourDeSemaine(dateStr: string): string {
    return this.joursSemaine[new Date(dateStr).getDay() - 1] ?? '';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  formatDateLong(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  totalLigne(l: LigneFeuilleTemps): number {
    return l.minutesNormales + l.minutesSupplementaires + l.minutesAbsence;
  }

  readonly formatMin = (min: number) => FeuilleTempsService.formatMinutes(min);

  getInitiales(nom: string): string {
    return (nom || '?').split(' ').map(n => n[0] ?? '').join('').toUpperCase().substring(0, 2);
  }

  getAvatarGradient(ft: FeuilleTemps): string {
    if (ft.statut === 'VALIDEE') return 'linear-gradient(135deg, #10b981, #059669)';
    if (ft.statut === 'REJETEE') return 'linear-gradient(135deg, #ef4444, #dc2626)';
    return 'linear-gradient(135deg, #3b82f6, #2563eb)';
  }
}