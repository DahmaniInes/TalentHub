import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjetStageService }       from '../../../services/projet-stage-service.service';
import { StagiaireService }         from '../../../services/stagiaire.service';
import { UserService }              from '../../../services/user.service';
import { KeycloakService }          from '../../../services/keycloak.service';
import { Utilisateur }              from '../../../shared/models/utilisateur.model';
import { ProjetStage }              from '../../../shared/models/projet-stage.model';
import { ActiviteStage }            from '../../../shared/models/activite-stage.model';
import { Router }                   from '@angular/router';

@Component({
  selector: 'app-mon-profil-stagiaire',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mon-profil-stagiaire.component.html'
})
export class MonProfilStagiaireComponent implements OnInit {
  private userSvc  = inject(UserService);
  private stagSvc  = inject(StagiaireService);
  private projetSvc = inject(ProjetStageService);
  private keycloak = inject(KeycloakService);
  private router   = inject(Router);

  currentUser  = signal<Utilisateur | null>(null);
  superviseurs = signal<Utilisateur[]>([]);
  projets      = signal<ProjetStage[]>([]);
  activites    = signal<ActiviteStage[]>([]);
  typesStage   = signal<any[]>([]);
  loading      = signal(true);
  tab          = signal<'profil' | 'projets' | 'activites'>('profil');

  estStagiaire = computed(() =>
    this.currentUser()?.profilNom?.toLowerCase().includes('stagiaire') ?? false
  );

  avancementMoyen = computed(() => {
    const list = this.projets();
    if (!list.length) return 0;
    return Math.round(list.reduce((s, p) => s + p.avancement, 0) / list.length);
  });

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (!kcId) return;
    this.userSvc.getUserByKeycloakId(kcId).subscribe({
      next: u => {
        this.currentUser.set(u);
        this.loading.set(false);
        // Charger les projets
        this.projetSvc.getByStagiaire(u.id).subscribe({ next: d => this.projets.set(d) });
        // Charger les activités
        this.projetSvc.getAllActivites().subscribe({
          next: d => this.activites.set(d.filter(a => a.assigneId === u.id || a.createurId === u.id))
        });
        // Charger superviseurs depuis la liste
        if (u.superviseurIds?.length) {
          this.stagSvc.getSuperviseurs().subscribe({
            next: list => this.superviseurs.set(list.filter(s => u.superviseurIds!.includes(s.id)))
          });
        }
        // Types de stage
        this.userSvc.getTypesStage().subscribe({ next: d => this.typesStage.set(d) });
      }
    });
  }

  getTypeStageLibelle(id?: number): string {
    if (!id) return '—';
    return this.typesStage().find(t => t.id === id)?.libelle ?? '—';
  }

  getInitiales(nom?: string): string {
    if (!nom) return '?';
    const p = nom.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : nom.substring(0, 2).toUpperCase();
  }

  avancementColor(v: number): string {
    if (v >= 80) return '#10b981';
    if (v >= 40) return '#f59e0b';
    return '#6366f1';
  }

  fmtDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  goProjet(id: number): void { this.router.navigate(['/projets-stage', id]); }
}