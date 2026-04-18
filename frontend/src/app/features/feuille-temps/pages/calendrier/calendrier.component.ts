// src/app/features/feuille-temps/pages/calendrier/calendrier.component.ts
// ✅ FIX : "aller aujourd'hui()" → "allerAujourdhui()" — l'apostrophe cassait le parser Angular
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeuilleTempsService } from '../../../../services/feuille-temps.service';
import { UserService }         from '../../../../services/user.service';
import { KeycloakService }     from '../../../../services/keycloak.service';
import { UiService }           from '../../../../services/ui.service';
import { ErrorService }        from '../../../../services/error.service';
import { FeuilleTemps, LigneFeuilleTemps, LigneFeuilleTempsRequest } from '../../../../shared/models/feuille-temps.model';
import { Utilisateur } from '../../../../shared/models/utilisateur.model';
import { HttpErrorResponse } from '@angular/common/http';

interface JourCalendrier {
  date: string;
  num: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  entrees: EntreeCalendrier[];
}

interface EntreeCalendrier {
  id?: number;
  feuilleId: number;
  feuilleStatut: string;
  projetNom?: string;
  activiteNom?: string;
  projetId?: number;
  activiteId?: number;
  clientId?: number;
  clientNom?: string;
  heureDebut?: string;
  heureFin?: string;
  minutesTravaillees: number;
  minutesSupplementaires: number;
  commentaire?: string;
  couleur: string;
}

@Component({
  selector: 'app-calendrier-ft',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="mx-page">
  <div class="mx-page-header">
    <div class="mx-page-title-block">
      <h1 class="mx-page-title">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" style="width:20px;height:20px"><rect x="2" y="3" width="16" height="15" rx="2"/><path d="M2 8h16M6 1v4M14 1v4" stroke-linecap="round"/></svg>
        Calendrier
      </h1>
    </div>
    <div class="mx-page-actions" style="gap:8px">
      <button class="mx-btn mx-btn-ghost" (click)="moisPrec()">
        <svg viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <span style="font-size:.88rem;font-weight:700;color:var(--text-primary);min-width:140px;text-align:center">{{ labelMois() }}</span>
      <button class="mx-btn mx-btn-ghost" (click)="moisSuiv()">
        <svg viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <!-- ✅ FIX — méthode renommée sans apostrophe -->
      <button class="mx-btn mx-btn-ghost mx-btn-sm" (click)="allerAujourdhui()">Aujourd'hui</button>
    </div>
  </div>

  <div *ngIf="loading()" class="mx-loading"><div class="mx-spinner"></div> Chargement...</div>

  <div *ngIf="!loading()" class="ft-cal-wrap">
    <div class="ft-cal-header">
      <div *ngFor="let j of joursSemaine" class="ft-cal-th">{{ j }}</div>
    </div>
    <div class="ft-cal-grid">
      <div *ngFor="let jour of jours()"
           class="ft-cal-cell"
           [class.ft-cal-other-month]="!jour.isCurrentMonth"
           [class.ft-cal-today]="jour.isToday"
           [class.ft-cal-weekend]="jour.isWeekend"
           (dragover)="onDragOver($event)"
           (drop)="onDrop($event, jour.date)">

        <div class="ft-cal-num" [class.ft-today-num]="jour.isToday">{{ jour.num }}</div>

        <div *ngFor="let e of jour.entrees"
             class="ft-cal-entry"
             [style.background]="e.couleur + '20'"
             [style.border-left]="'3px solid ' + e.couleur"
             [draggable]="peutDrag(e)"
             (dragstart)="onDragStart($event, e, jour.date)"
             [title]="(e.projetNom || '') + (e.activiteNom ? ' — ' + e.activiteNom : '')"
             (click)="$event.stopPropagation(); ouvrirDetail(e)">
          <span class="ft-cal-entry-time" [style.color]="e.couleur">{{ e.heureDebut || '' }}<span *ngIf="e.heureFin"> – {{ e.heureFin }}</span></span>
          <span class="ft-cal-entry-label" [style.color]="e.couleur">{{ e.projetNom || 'Sans projet' }}</span>
          <span *ngIf="e.activiteNom" class="ft-cal-entry-sub">{{ e.activiteNom }}</span>
          <span class="ft-cal-entry-dur">{{ fmt(e.minutesTravaillees) }}</span>
        </div>

        <div *ngIf="jour.isCurrentMonth" class="ft-cal-add" (click)="ouvrirAjout(jour.date)">+</div>
      </div>
    </div>
  </div>
</div>

<!-- Modal détail -->
<div *ngIf="detailEntree()" class="mx-modal-backdrop" (click)="detailEntree.set(null)">
  <div class="mx-modal" style="max-width:360px;padding:0;overflow:hidden" (click)="$event.stopPropagation()">
    <div style="padding:14px 16px 10px;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:10px">
      <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0" [style.background]="detailEntree()!.couleur"></div>
      <span style="font-size:.88rem;font-weight:700;flex:1">{{ detailEntree()!.projetNom || 'Sans projet' }}</span>
      <button class="mx-so-close" (click)="detailEntree.set(null)"><svg viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button>
    </div>
    <div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px">
      <div style="font-size:.78rem;color:var(--text-muted)">Activité : <strong style="color:var(--text-primary)">{{ detailEntree()!.activiteNom || '—' }}</strong></div>
      <div style="font-size:.78rem;color:var(--text-muted)">Horaire : <strong style="color:var(--text-primary)">{{ detailEntree()!.heureDebut || '—' }} – {{ detailEntree()!.heureFin || '—' }}</strong></div>
      <div style="font-size:.78rem;color:var(--text-muted)">Durée : <strong style="color:var(--text-primary)">{{ fmt(detailEntree()!.minutesTravaillees) }}</strong></div>
      <div *ngIf="detailEntree()!.commentaire" style="font-size:.75rem;color:var(--text-muted);background:var(--bg-hover);padding:6px 8px;border-radius:5px">{{ detailEntree()!.commentaire }}</div>
    </div>
  </div>
</div>
  `
})
export class CalendrierFtComponent implements OnInit {
  private ftSvc    = inject(FeuilleTempsService);
  private userSvc  = inject(UserService);
  private keycloak = inject(KeycloakService);
  readonly ui      = inject(UiService);
  private errorSvc = inject(ErrorService);

  currentUser  = signal<Utilisateur | null>(null);
  feuilles     = signal<FeuilleTemps[]>([]);
  loading      = signal(false);
  moisCourant  = signal<Date>(new Date());
  detailEntree = signal<EntreeCalendrier | null>(null);
  dragging     = signal<{ entree: EntreeCalendrier; dateSource: string } | null>(null);

  readonly joursSemaine = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  readonly fmt = FeuilleTempsService.formatMinutes;
  readonly COULEURS_PROJETS = ['#6366f1','#8b5cf6','#10b981','#f97316','#ef4444','#3b82f6','#c026d3','#eab308'];

  labelMois = computed(() =>
    this.moisCourant().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  );

  jours = computed((): JourCalendrier[] => {
    const now   = this.moisCourant();
    const today = new Date().toISOString().split('T')[0];
    const year  = now.getFullYear();
    const month = now.getMonth();

    const premier = new Date(year, month, 1);
    const dernier = new Date(year, month + 1, 0);

    const startDay = premier.getDay();
    const offset   = startDay === 0 ? 6 : startDay - 1;
    const debut    = new Date(premier);
    debut.setDate(debut.getDate() - offset);

    const fin    = new Date(dernier);
    const endDay = fin.getDay();
    fin.setDate(fin.getDate() + (endDay === 0 ? 0 : 7 - endDay));

    const jours: JourCalendrier[] = [];
    const cursor = new Date(debut);

    while (cursor <= fin) {
      const dateStr = cursor.toISOString().split('T')[0];
      const day     = cursor.getDay();
      jours.push({
        date: dateStr, num: cursor.getDate(),
        isCurrentMonth: cursor.getMonth() === month,
        isToday: dateStr === today,
        isWeekend: day === 0 || day === 6,
        entrees: this.getEntreesPourDate(dateStr)
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return jours;
  });

  ngOnInit(): void {
    const kcId = this.keycloak.getKeycloakUserId();
    if (kcId) {
      this.userSvc.getUserByKeycloakId(kcId).subscribe({
        next: u => { this.currentUser.set(u); this.loadFeuilles(u.id); },
        error: () => this.loadFeuilles()
      });
    }
  }

  loadFeuilles(userId?: number): void {
    this.loading.set(true);
    const obs = userId ? this.ftSvc.getByUtilisateur(userId) : this.ftSvc.getAll();
    obs.subscribe({ next: d => { this.feuilles.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  getEntreesPourDate(date: string): EntreeCalendrier[] {
    const entrees: EntreeCalendrier[] = [];
    const projetCouleurs: Record<string, string> = {};
    let colorIdx = 0;

    for (const ft of this.feuilles()) {
      for (const l of ft.lignes || []) {
        if (l.date !== date) continue;
        const key = String(l.projetId ?? '0');
        if (!projetCouleurs[key]) projetCouleurs[key] = this.COULEURS_PROJETS[colorIdx++ % this.COULEURS_PROJETS.length];
        entrees.push({
          id: l.id, feuilleId: ft.id, feuilleStatut: ft.statut,
          projetNom: l.projetNom, activiteNom: l.activiteNom,
          projetId: l.projetId, activiteId: l.activiteId,
          clientId: l.clientId, clientNom: l.clientNom,
          heureDebut: l.heureDebut, heureFin: l.heureFin,
          minutesTravaillees: l.minutesTravaillees,
          minutesSupplementaires: l.minutesSupplementaires,
          commentaire: l.commentaire,
          couleur: projetCouleurs[key]
        });
      }
    }
    return entrees;
  }

  moisPrec(): void { const d = new Date(this.moisCourant()); d.setMonth(d.getMonth() - 1); this.moisCourant.set(d); }
  moisSuiv(): void { const d = new Date(this.moisCourant()); d.setMonth(d.getMonth() + 1); this.moisCourant.set(d); }

  // ✅ FIX — Renommée de "aller aujourd'hui" en "allerAujourdhui" (sans apostrophe dans le nom)
  allerAujourdhui(): void { this.moisCourant.set(new Date()); }

  ouvrirDetail(e: EntreeCalendrier): void { this.detailEntree.set(e); }
  ouvrirAjout(date: string): void { this.ui.success(`Allez dans "Ma semaine" pour saisir des heures le ${date}.`); }

  peutDrag(e: EntreeCalendrier): boolean { return e.feuilleStatut === 'BROUILLON' || e.feuilleStatut === 'REJETEE'; }

  // ✅ FIX — signature avec dateSource en paramètre (plus de signal dragging séparé)
  onDragStart(event: DragEvent, entree: EntreeCalendrier, dateSource: string): void {
    if (!this.peutDrag(entree)) { event.preventDefault(); return; }
    this.dragging.set({ entree, dateSource });
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); }

  onDrop(event: DragEvent, dateCible: string): void {
    event.preventDefault();
    const drag = this.dragging();
    if (!drag || drag.dateSource === dateCible) { this.dragging.set(null); return; }

    const { entree } = drag;
    const ft = this.feuilles().find(f => f.id === entree.feuilleId);
    if (!ft) return;

    const lignesReq: LigneFeuilleTempsRequest[] = (ft.lignes || []).map(l => ({
      date: l.id === entree.id ? dateCible : l.date,
      projetId: l.projetId, projetNom: l.projetNom,
      activiteId: l.activiteId, activiteNom: l.activiteNom,
      clientId: l.clientId, clientNom: l.clientNom,
      heureDebut: l.heureDebut, heureFin: l.heureFin,
      minutesTravaillees: l.minutesTravaillees,
      minutesSupplementaires: l.minutesSupplementaires,
      commentaire: l.commentaire,
      estWeekend: FeuilleTempsService.isWeekend(l.id === entree.id ? dateCible : l.date)
    }));

    this.ftSvc.update(ft.id, {
      utilisateurId: ft.utilisateurId,
      semaineDu: ft.semaineDu, semaineAu: ft.semaineAu,
      statut: ft.statut, lignes: lignesReq
    }).subscribe({
      next: updated => {
        this.feuilles.update(fts => fts.map(f => f.id === updated.id ? updated : f));
        this.ui.success(`Entrée déplacée au ${dateCible}.`);
        this.dragging.set(null);
      },
      error: (err: HttpErrorResponse) => { this.ui.error(this.errorSvc.parse(err).message); this.dragging.set(null); }
    });
  }
}