// src/app/features/feuille-temps/pages/centre-donnees/centre-donnees.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeuilleTempsService } from '../../../../services/feuille-temps.service';
import { ProjetService }       from '../../../../services/projet.service';
import { ActiviteService }     from '../../../../services/activite.service';
import { UserService }         from '../../../../services/user.service';
import { KeycloakService }     from '../../../../services/keycloak.service';
import { GroupeService, MembreInfo } from '../../../../services/groupe.service';
import { PermissionContextService } from '../../../../services/permission-context.service';
import { UiService }           from '../../../../services/ui.service';
import { FeuilleTemps } from '../../../../shared/models/feuille-temps.model';
import { Projet }      from '../../../../shared/models/projet.model';
import { Activite }    from '../../../../shared/models/activite.model';
import { Utilisateur } from '../../../../shared/models/utilisateur.model';
import { Groupe }      from '../../../../shared/models/groupe.model';

interface LigneExport {
  utilisateur: string;
  semaine: string;
  date: string;
  projet: string;
  activite: string;
  duree: string;
  dureeMin: number;
  supp: string;
  statut: string;
  commentaire: string;
}

@Component({
  selector: 'app-centre-donnees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './centre-donnees.component.html',
  styleUrls: ['./centre-donnees.component.css']
})
export class CentreDonneesComponent implements OnInit {
  private ftSvc       = inject(FeuilleTempsService);
  private projetSvc   = inject(ProjetService);
  private activiteSvc = inject(ActiviteService);
  private userSvc     = inject(UserService);
  private keycloak    = inject(KeycloakService);
  private groupeSvc   = inject(GroupeService);
  readonly perms      = inject(PermissionContextService);
  readonly ui         = inject(UiService);

  feuilles      = signal<FeuilleTemps[]>([]);
  projets       = signal<Projet[]>([]);
  utilisateurs  = signal<MembreInfo[]>([]);
  currentUser   = signal<Utilisateur | null>(null);

  // ✅ NOUVEAU — groupes disponibles pour le filtre (remplace "Employé")
  tousGroupes   = signal<Groupe[]>([]);

  loading       = signal(false);
  apercu        = signal(false);
  lignesExport  = signal<LigneExport[]>([]);

  currentPage = 1;
  pageSize    = 25;

  filtres = {
    dateDu: '',
    dateAu: '',
    groupeId: '',     // ✅ remplace utilisateurId
    statut: '',
    projetId: '',
    activiteId: ''
  };

  activitesFiltrees = signal<Activite[]>([]);

  readonly fmt = FeuilleTempsService.formatMinutes;
  readonly min = Math.min;

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => {
          this.currentUser.set(u);
          this.loadUtilisateursDropdown(u.id);
          this.loadGroupesDisponibles();
          this.loadProjets(u.id);
          this.loadFeuilles();
        },
        error: () => this.loadFeuilles()
      });
    } else {
      this.loadFeuilles();
    }
  }

  // ── Permissions ──
  canReadAll(): boolean   { return this.perms.can('TS_ALL_READ'); }
  canEditAll(): boolean   { return this.perms.can('TS_ALL_UPDATE'); }
  canReadGroup(): boolean { return this.perms.can('TS_GROUP_READ'); }
  canEditGroup(): boolean { return this.perms.can('TS_GROUP_UPDATE'); }

  utilisateursDisponibles(): any[] {
    const me = this.currentUser();
    const list: any[] = [...this.utilisateurs()];
    if (me && !list.some(u => u.id === me.id)) list.unshift(me);
    return list;
  }

  /**
   * ✅ NOUVEAU — Groupes proposés dans le filtre :
   * TS_ALL_* → tous les groupes de l'application.
   * TS_GROUP_* (sans TS_ALL_*) → uniquement les groupes dont l'utilisateur
   * connecté est membre.
   */
  groupesDisponibles(): Groupe[] {
    if (this.canReadAll() || this.canEditAll()) return this.tousGroupes();
    if (this.canReadGroup() || this.canEditGroup()) {
      const me = this.currentUser();
      if (!me) return [];
      return this.tousGroupes().filter(g =>
        (g.membres ?? []).some((m: any) => m.id === me.id));
    }
    return [];
  }

  totalMinutes(): number {
    return this.lignesExport().reduce((s, l) => s + l.dureeMin, 0);
  }

  totalSupp(): number {
    return this.lignesExport().reduce((s, l) => s + (parseInt(l.supp) || 0), 0);
  }

  totalFeuilles(): number {
    return new Set(this.lignesExport().map(l => l.semaine + l.utilisateur)).size;
  }

  pagedLignes(): LigneExport[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.lignesExport().slice(start, start + this.pageSize);
  }

  private loadUtilisateursDropdown(meId: number): void {
    if (this.canReadAll() || this.canEditAll()) {
      this.groupeSvc.getTousMembresDeGroupes(meId).subscribe({
        next: d => this.utilisateurs.set(d),
        error: () => this.utilisateurs.set([])
      });
    } else if (this.canReadGroup() || this.canEditGroup()) {
      this.groupeSvc.getCoequipiers(meId).subscribe({
        next: d => this.utilisateurs.set(d),
        error: () => this.utilisateurs.set([])
      });
    }
  }

  private loadGroupesDisponibles(): void {
    this.groupeSvc.getAll().subscribe({
      next: d => this.tousGroupes.set(d),
      error: () => this.tousGroupes.set([])
    });
  }

  private loadProjets(userId: number): void {
    this.projetSvc.getVisiblesPourFeuilleTemps(userId).subscribe({
      next: d => this.projets.set(d),
      error: () => this.ui.error('Erreur lors du chargement des projets.')
    });
  }

  private loadFeuilles(): void {
    const me = this.currentUser();

    if (this.canReadAll() || this.canEditAll()) {
      this.ftSvc.getAll().subscribe({ next: d => this.feuilles.set(d) });
      return;
    }

    if (this.canReadGroup() || this.canEditGroup()) {
      this.ftSvc.getAll().subscribe({
        next: d => {
          const idsAutorises = new Set<number>(this.utilisateurs().map(u => u.id));
          if (me) idsAutorises.add(me.id);
          this.feuilles.set(d.filter(ft => idsAutorises.has(ft.utilisateurId)));
        }
      });
      return;
    }

    this.ftSvc.getByUtilisateur(me?.id ?? 0).subscribe({ next: d => this.feuilles.set(d) });
  }

  onProjetChange(): void {
    this.filtres.activiteId = '';
    if (!this.filtres.projetId) { this.activitesFiltrees.set([]); return; }
    const pid = +this.filtres.projetId;

    this.activiteSvc.getByProjet(pid).subscribe({
      next: d => this.activitesFiltrees.set(d)
    });
    this.activiteSvc.getGlobalesDisponiblesPourProjet(pid).subscribe({
      next: d => this.activitesFiltrees.update(cur => {
        const ids = new Set(cur.map(a => a.id));
        return [...cur, ...d.filter(a => !ids.has(a.id))];
      })
    });
  }

  resetFiltres(): void {
    this.filtres = { dateDu: '', dateAu: '', groupeId: '', statut: '', projetId: '', activiteId: '' };
    this.activitesFiltrees.set([]);
    this.lignesExport.set([]);
    this.apercu.set(false);
  }

  /**
   * ✅ Résout les IDs utilisateur correspondant au groupe sélectionné.
   * Si aucun groupe n'est sélectionné, retourne null (= pas de filtre par
   * utilisateur).
   */
  private resolveUserIdsDuGroupe(): Set<number> | null {
    if (!this.filtres.groupeId) return null;
    const g = this.tousGroupes().find(x => x.id === +this.filtres.groupeId);
    if (!g?.membres) return new Set();
    return new Set((g.membres as any[]).map(m => m.id));
  }

  /**
   * ✅ Construit la liste de lignes filtrées — extrait dans une méthode
   * réutilisable par chargerApercu() ET par les méthodes d'export, pour
   * que l'export fonctionne directement depuis le formulaire rempli, sans
   * obliger l'utilisateur à cliquer d'abord sur "Aperçu".
   */
  private buildLignesExport(): LigneExport[] {
    const lignes: LigneExport[] = [];
    const idsGroupe = this.resolveUserIdsDuGroupe();

    for (const ft of this.feuilles()) {
      if (this.filtres.statut && ft.statut !== this.filtres.statut) continue;
      if (idsGroupe && !idsGroupe.has(ft.utilisateurId)) continue;
      if (this.filtres.dateDu && ft.semaineDu < this.filtres.dateDu) continue;
      if (this.filtres.dateAu && ft.semaineDu > this.filtres.dateAu) continue;

      for (const l of ft.lignes || []) {
        if (this.filtres.projetId && l.projetId !== +this.filtres.projetId) continue;
        if (this.filtres.activiteId && l.activiteId !== +this.filtres.activiteId) continue;

        lignes.push({
          utilisateur: ft.utilisateurNom || `User #${ft.utilisateurId}`,
          semaine: ft.semaineDu,
          date: l.date,
          projet: l.projetNom || '',
          activite: l.activiteNom || '',
          duree: this.fmtMin(l.minutesTravaillees),
          dureeMin: l.minutesTravaillees,
          supp: this.fmtMin(l.minutesSupplementaires),
          statut: ft.statut,
          commentaire: l.commentaire || ''
        });
      }
    }

    lignes.sort((a, b) => a.date.localeCompare(b.date));
    return lignes;
  }

  chargerApercu(): void {
    this.loading.set(true);
    this.currentPage = 1;
    const lignes = this.buildLignesExport();
    this.lignesExport.set(lignes);
    this.apercu.set(true);
    this.loading.set(false);
    if (lignes.length === 0) this.ui.warning('Aucune donnée pour ces critères.');
  }

  private fmtMin(m: number): string {
    const h = Math.floor(m / 60);
    const mn = m % 60;
    return `${h}:${String(mn).padStart(2, '0')}`;
  }

  /**
   * ✅ Les exports recalculent toujours les lignes à partir des filtres
   * actuels (au lieu de dépendre de lignesExport() déjà peuplé par un clic
   * préalable sur "Aperçu") — corrige le bug des boutons qui restaient
   * désactivés / inopérants après remplissage du formulaire sans passer
   * par l'aperçu.
   */
  exporterCSV(): void {
    const lignes = this.lignesExport().length > 0 ? this.lignesExport() : this.buildLignesExport();
    if (lignes.length === 0) { this.ui.warning('Aucune donnée à exporter pour ces critères.'); return; }
    this.lignesExport.set(lignes);

    const header = ['Employé','Semaine','Date','Projet','Activité','Durée','Suppl.','Statut','Commentaire'];
    const rows = lignes.map(l => [l.utilisateur, l.semaine, l.date, l.projet, l.activite, l.duree, l.supp, l.statut, l.commentaire]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    this.downloadFile(bom + csv, `export-temps-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8');
    this.ui.success('Export CSV téléchargé ✅');
  }

  exporterXLS(): void {
    const lignes = this.lignesExport().length > 0 ? this.lignesExport() : this.buildLignesExport();
    if (lignes.length === 0) { this.ui.warning('Aucune donnée à exporter pour ces critères.'); return; }
    this.lignesExport.set(lignes);

    const header = ['Employé','Semaine','Date','Projet','Activité','Durée','Suppl.','Statut'];
    const rows = lignes.map(l => [l.utilisateur, l.semaine, l.date, l.projet, l.activite, l.duree, l.supp, l.statut]);
    let html = '<table border="1"><thead><tr>' + header.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
    html += rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('');
    html += '</tbody></table>';
    this.downloadFile(html, `export-temps-${new Date().toISOString().split('T')[0]}.xls`, 'application/vnd.ms-excel');
    this.ui.success('Export XLS téléchargé ✅');
  }

  exporterPDF(): void {
    const lignes = this.lignesExport().length > 0 ? this.lignesExport() : this.buildLignesExport();
    if (lignes.length === 0) { this.ui.warning('Aucune donnée à exporter pour ces critères.'); return; }
    this.lignesExport.set(lignes);

    const header = ['Employé','Semaine','Date','Projet','Activité','Durée','Statut'];
    const rows = lignes.map(l => [l.utilisateur, l.semaine, l.date, l.projet, l.activite, l.duree, l.statut]);

    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Export Fiches de Temps</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #333; }
  h2 { font-size: 15px; margin-bottom: 4px; }
  p  { font-size: 10px; color: #666; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f0f0f0; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .4px; border: 1px solid #ddd; }
  td { padding: 5px 8px; border: 1px solid #eee; }
  tr:nth-child(even) td { background: #fafafa; }
  .total { margin-top: 12px; font-weight: bold; font-size: 11px; }
</style></head><body>
<h2>Rapport — Fiches de temps</h2>
<p>Généré le ${new Date().toLocaleDateString('fr-FR')} · ${lignes.length} entrées · ${this.fmtMin(lignes.reduce((s,l)=>s+l.dureeMin,0))} total</p>
<table>
<thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
</table>
<p class="total">Total : ${this.fmtMin(lignes.reduce((s,l)=>s+l.dureeMin,0))}</p>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
    this.ui.success('Impression PDF ouverte ✅');
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}