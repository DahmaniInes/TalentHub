import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProjetStageService }           from '../../../services/projet-stage-service.service';
import { StagiaireService }             from '../../../services/stagiaire.service';
import { UserService }                  from '../../../services/user.service';
import { KeycloakService }              from '../../../services/keycloak.service';
import { NomenclatureAcademiqueService } from '../../../services/nomenclature-academique-service.service';
import { ProjetService }                from '../../../services/projet.service';
import { StatutActiviteService }        from '../../../services/statutactivite.service';

import { Utilisateur, SuperviseurMin } from '../../../shared/models/utilisateur.model';
import { Projet, StatutProjet }        from '../../../shared/models/projet.model';
import { Activite }                    from '../../../shared/models/activite.model';
import { Universite, Specialite, NiveauEtude } from '../../../shared/models/nomenclature-academique.model';
import { StatutActivite }              from '../../../shared/models/statut-activite.model';
import { Router }                      from '@angular/router';

@Component({
  selector: 'app-mon-profil-stagiaire',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mon-profil-stagiaire.component.html'
})
export class MonProfilStagiaireComponent implements OnInit {

  private userSvc   = inject(UserService);
  private stagSvc   = inject(StagiaireService);
  private projetSvc = inject(ProjetStageService);
  private projetSvcAdmin = inject(ProjetService);
  private keycloak  = inject(KeycloakService);
  private nomencSvc = inject(NomenclatureAcademiqueService);
  private statutSvc = inject(StatutActiviteService);
  private router    = inject(Router);

  currentUser    = signal<Utilisateur | null>(null);
  superviseurs   = signal<SuperviseurMin[]>([]);
  projets        = signal<Projet[]>([]);
  activites      = signal<Activite[]>([]);
  typesStage     = signal<any[]>([]);
  universites    = signal<Universite[]>([]);
  specialites    = signal<Specialite[]>([]);
  niveaux        = signal<NiveauEtude[]>([]);
  statutsProjet  = signal<StatutProjet[]>([]);
  statutsActivite = signal<StatutActivite[]>([]);
  loading        = signal(true);
  tab            = signal<'profil' | 'projets' | 'activites'>('profil');

  avancementMoyen = computed(() => {
    const list = this.projets();
    if (!list.length) return 0;
    return Math.round(list.reduce((s, p) => s + p.avancement, 0) / list.length);
  });

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (!kcId) return;

    // Charger nomenclature
    this.nomencSvc.getUniversites().subscribe({ next: d => this.universites.set(d) });
    this.nomencSvc.getSpecialites().subscribe({ next: d => this.specialites.set(d) });
    this.nomencSvc.getNiveaux().subscribe({ next: d => this.niveaux.set(d) });
    this.stagSvc.getTypesStage().subscribe({ next: d => this.typesStage.set(d) });
    this.projetSvcAdmin.getStatutsProjet().subscribe({ next: d => this.statutsProjet.set(d) });
    this.statutSvc.getStatutsActivite().subscribe({ next: d => this.statutsActivite.set(d) });

    this.userSvc.getUserByKeycloakId(kcId).subscribe({
      next: u => {
        this.currentUser.set(u);
        this.loading.set(false);

        // Charger les projets du stagiaire
        this.projetSvc.getByStagiaire(u.id).subscribe({
          next: d => this.projets.set(d)
        });

        // Charger les activités assignées
        this.projetSvc.getAllActivites().subscribe({
          next: d => this.activites.set(
            d.filter(a => a.utilisateurId === u.id))
        });

        // Superviseurs depuis le user
        if (u.superviseurs?.length) {
          this.superviseurs.set(u.superviseurs);
        } else if (u.superviseurIds?.length) {
          this.stagSvc.getSuperviseurs().subscribe({
            next: list => this.superviseurs.set(
              list
                .filter(s => u.superviseurIds!.includes(s.id))
                .map(s => ({
                  id: s.id,
                  nomComplet: s.nomComplet || '',
                  email: s.email,
                  photoUrl: s.photoUrl,
                  poste: s.poste
                }))
            )
          });
        }
      }
    });
  }

  // ── Helpers nomenclature ──
  getUniversiteLibelle(id?: number): string {
    if (!id) return '—';
    return this.universites().find(u => u.id === id)?.libelle ?? '—';
  }

  getSpecialiteLibelle(id?: number): string {
    if (!id) return '—';
    return this.specialites().find(s => s.id === id)?.libelle ?? '—';
  }

  getNiveauLibelle(id?: number): string {
    if (!id) return '—';
    return this.niveaux().find(n => n.id === id)?.libelle ?? '—';
  }

  getTypeStageLibelle(id?: number): string {
    if (!id) return '—';
    return this.typesStage().find(t => t.id === id)?.libelle ?? '—';
  }

  // ✅ Accès au premier stage actif
  getPremierTypeStage(): number | undefined {
    return this.currentUser()?.stages?.[0]?.typeStageId;
  }

  getPremierDateDebut(): string | undefined {
    return this.currentUser()?.stages?.[0]?.dateDebut;
  }

  getPremierDateFin(): string | undefined {
    return this.currentUser()?.stages?.[0]?.dateFin;
  }

  getPremierDateSoutenance(): string | undefined {
    return this.currentUser()?.stages?.[0]?.dateSoutenance;
  }

  // ✅ Statut projet via nomenclature (remplace p.statut String)
  getStatutProjetLabel(statutProjetId?: number): string {
    return this.statutsProjet().find(s => s.id === statutProjetId)?.libelle || '—';
  }

  getStatutProjetColor(statutProjetId?: number): string {
    return this.statutsProjet().find(s => s.id === statutProjetId)?.couleur || '#94a3b8';
  }

  getStatutProjetCode(statutProjetId?: number): string {
    return this.statutsProjet().find(s => s.id === statutProjetId)?.code || '';
  }

  // ✅ Statut activité via nomenclature (remplace a.statut String)
  getStatutActiviteLabel(id?: number): string {
    return this.statutsActivite().find(s => s.id === id)?.libelle || '—';
  }

  getStatutActiviteCode(id?: number): string {
    return this.statutsActivite().find(s => s.id === id)?.code || '';
  }

  getInitiales(nom?: string): string {
    if (!nom) return '?';
    const p = nom.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : nom.substring(0, 2).toUpperCase();
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