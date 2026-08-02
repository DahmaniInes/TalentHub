// clients.component.ts — COMPLET avec permissions
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../../services/client.service';
import { UiService } from '../../../services/ui.service';
import { ErrorService } from '../../../services/error.service';
import { PermissionContextService } from '../../../services/permission-context.service';
import { Client } from '../../../shared/models/client.model';
import { HttpErrorResponse } from '@angular/common/http';

export interface ClientRequest {
  nom: string;
  description?: string;
  compte?: string;
  idTva?: string;
  devise?: string;
  couleur?: string;
  contact?: string;
  courriel?: string;
  pageAccueil?: string;
  mobile?: string;
  telephone?: string;
  fax?: string;
  budget?: number;
  quotaHoraire?: number;
  typeBudget?: string;
  nomSociete?: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
  fuseauHoraire?: string;
  visible?: boolean;
  facturable?: boolean;
  actif?: boolean;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.css']
})
export class ClientsComponent implements OnInit {
  private clientSvc = inject(ClientService);
  private errorSvc  = inject(ErrorService);
  readonly ui       = inject(UiService);
  // ✅ NOUVEAU
  readonly perms    = inject(PermissionContextService);

  clients = signal<Client[]>([]);

  loading        = signal(true);
  search         = signal('');
  filterStatut   = signal<'tous' | 'actif' | 'inactif'>('tous');
  showModal      = signal(false);
  editingClient  = signal<Client | null>(null);
  selectedClient = signal<Client | null>(null);
  activeTab      = signal<'general' | 'contact' | 'finance' | 'adresse'>('general');
  detailTab      = signal<'coordonnees' | 'finance' | 'adresse'>('coordonnees');

  selectedIds = signal<Set<number>>(new Set());
  pageSize    = signal(10);
  currentPage = signal(1);
  openMenuId  = signal<number | null>(null);

  filterPanelOpenC = signal(false);

  form = signal<ClientRequest>({
    nom: '', devise: 'TND', couleur: '#6366f1',
    typeBudget: 'ILLIMITE', visible: true, facturable: true, actif: true
  });

  readonly COULEURS    = ['#6366f1','#8b5cf6','#c026d3','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#10b981','#06b6d4','#3b82f6','#64748b'];
  readonly TYPE_BUDGETS = ['MENSUEL','TRIMESTRIEL','ANNUEL','ILLIMITE'];

  filteredClients = computed(() => {
    let list = this.clients();
    if (this.filterStatut() === 'actif')   list = list.filter(c => c.actif);
    if (this.filterStatut() === 'inactif') list = list.filter(c => !c.actif);
    const q = this.search().toLowerCase();
    if (!q) return list;
    return list.filter(c =>
      c.nom.toLowerCase().includes(q) ||
      (c.nomSociete || '').toLowerCase().includes(q) ||
      (c.courriel   || '').toLowerCase().includes(q) ||
      (c.contact    || '').toLowerCase().includes(q)
    );
  });

  statsActifs   = computed(() => this.clients().filter(c => c.actif).length);
  statsInactifs = computed(() => this.clients().filter(c => !c.actif).length);

  totalPages   = computed(() => Math.max(1, Math.ceil(this.filteredClients().length / this.pageSize())));
  pagesArray   = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedClients = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredClients().slice(start, start + this.pageSize());
  });

  allPageSelected  = computed(() => { const p = this.pagedClients(); return p.length > 0 && p.every(c => this.selectedIds().has(c.id)); });
  somePageSelected = computed(() => { const p = this.pagedClients(); return p.some(c => this.selectedIds().has(c.id)) && !this.allPageSelected(); });
  selectedCount    = computed(() => this.selectedIds().size);

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    this.clientSvc.getAll().subscribe({
      next: d => { this.clients.set(d); this.loading.set(false); },
      error: () => { this.ui.error('Erreur chargement clients.'); this.loading.set(false); }
    });
  }

  openDetail(client: Client): void {
    this.selectedClient.set(client);
    this.detailTab.set('coordonnees');
    this.openMenuId.set(null);
  }

  openAdd(): void {
    if (!this.perms.canCreateCustomer()) { this.ui.warning('Permission CUSTOMER_CREATE requise.'); return; }
    this.editingClient.set(null);
    this.activeTab.set('general');
    this.form.set({ nom:'', devise:'TND', couleur:'#6366f1', typeBudget:'ILLIMITE', visible:true, facturable:true, actif:true });
    this.showModal.set(true);
  }

  openEdit(client: Client): void {
    if (!this.perms.canUpdateCustomer()) { this.ui.warning('Permission CUSTOMER_UPDATE requise.'); return; }
    this.editingClient.set(client);
    this.activeTab.set('general');
    this.form.set({
      nom:client.nom, description:client.description, compte:client.compte,
      idTva:client.idTva, devise:client.devise, couleur:client.couleur,
      contact:client.contact, courriel:client.courriel, pageAccueil:client.pageAccueil,
      mobile:client.mobile, telephone:client.telephone, fax:client.fax,
      budget:client.budget, quotaHoraire:client.quotaHoraire, typeBudget:client.typeBudget,
      nomSociete:client.nomSociete, codePostal:client.codePostal, ville:client.ville,
      pays:client.pays, fuseauHoraire:client.fuseauHoraire,
      visible:client.visible, facturable:client.facturable, actif:client.actif
    });
    this.showModal.set(true);
    this.openMenuId.set(null);
  }

  save(): void {
    const f = this.form();
    if (!f.nom?.trim()) { this.ui.warning('Le nom du client est obligatoire.'); return; }
    const editing = this.editingClient();
    const obs = editing ? this.clientSvc.update(editing.id, f) : this.clientSvc.create(f);
    obs.subscribe({
      next: () => { this.ui.success(editing ? 'Client mis à jour.' : 'Client créé.'); this.closeModal(); this.loadAll(); },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  delete(client: Client): void {
    if (!this.perms.canDeleteCustomer()) { this.ui.warning('Permission CUSTOMER_DELETE requise.'); return; }
    this.ui.confirm({
      title:'Supprimer le client', message:`Supprimer "${client.nom}" ?`,
      confirmLabel:'Supprimer', type:'danger',
      onConfirm: () => {
        this.clientSvc.delete(client.id).subscribe({
          next: () => { this.ui.success('Client supprimé.'); if (this.selectedClient()?.id===client.id) this.selectedClient.set(null); this.loadAll(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
    this.openMenuId.set(null);
  }

  closeModal(): void { this.showModal.set(false); this.editingClient.set(null); }

  goToPage(p: number): void { if (p>=1 && p<=this.totalPages()) this.currentPage.set(p); }
  onPageSizeChange(s: number): void { this.pageSize.set(s); this.currentPage.set(1); }
  resetPage(): void { this.currentPage.set(1); }
  minVal(a: number, b: number): number { return Math.min(a, b); }

  toggleSelectAll(): void {
    const p = this.pagedClients();
    if (this.allPageSelected()) { const s=new Set(this.selectedIds()); p.forEach(c=>s.delete(c.id)); this.selectedIds.set(s); }
    else { const s=new Set(this.selectedIds()); p.forEach(c=>s.add(c.id)); this.selectedIds.set(s); }
  }
  toggleSelect(id: number, e: Event): void { e.stopPropagation(); const s=new Set(this.selectedIds()); s.has(id)?s.delete(id):s.add(id); this.selectedIds.set(s); }
  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  clearSelection(): void { this.selectedIds.set(new Set()); }
  toggleMenu(id: number, e: Event): void { e.stopPropagation(); this.openMenuId.set(this.openMenuId()===id?null:id); }
  closeMenu(): void { this.openMenuId.set(null); this.filterPanelOpenC.set(false); }

  getInitiales(nom: string): string { return (nom||'').split(' ').slice(0,2).map(w=>w.charAt(0).toUpperCase()).join(''); }
  getCouleurStyle(couleur?: string): string { return couleur || '#6366f1'; }

  cleanUrl(url: string): string {
    if (!url) return '';
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  filterPanelOpenP = signal(false);



  // ── DASHBOARDS — nombre de projets par client + croissance clients ──
readonly GAUGE_COLORS = [
  { colorClass: 'pd5-color-primary',    hex: 'var(--accent)' },
  { colorClass: 'pd5-color-secondary',  hex: '#0d41f6' },
  { colorClass: 'pd5-color-tertiary',   hex: '#00c2ff' },
  { colorClass: 'pd5-color-quaternary', hex: '#10b981' },
  { colorClass: 'pd5-color-quinary',    hex: '#f59e0b' },
  { colorClass: 'pd5-color-senary',     hex: '#ef4444' },
];

readonly LINE_W = 300;
readonly LINE_H = 90;
readonly MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
private readonly MOIS_COMPLETS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

lineYear           = signal<number>(new Date().getFullYear());
lineMonthIdx        = signal<number>(new Date().getMonth());
lineCalendarOpen    = signal(false);
lineShowYearPicker  = signal(false);

lineMonthLabel(): string {
  return this.MOIS_COMPLETS[this.lineMonthIdx()] + ' ' + this.lineYear();
}
prevLineYear(): void { this.lineYear.update(y => y - 1); }
nextLineYear(): void { this.lineYear.update(y => y + 1); }
selectLineMonth(idx: number): void { this.lineMonthIdx.set(idx); this.lineCalendarOpen.set(false); }
toggleLineCalendar(): void { this.lineCalendarOpen.set(!this.lineCalendarOpen()); }
toggleLineYearPicker(): void { this.lineShowYearPicker.set(!this.lineShowYearPicker()); }
getYearRange(): number[] {
  const current = new Date().getFullYear();
  const result: number[] = [];
  for (let y = current - 3; y <= current + 2; y++) result.push(y);
  return result;
}

// ── Jauge : nombre de projets par client (remplace "Taux de complétion par priorité") ──
private getClientsByProjets(): { client: Client; nombreProjets: number }[] {
  return [...this.clients()]
    .map(c => ({ client: c, nombreProjets: c.nombreProjets || 0 }))
    .filter(item => item.nombreProjets > 0)
    .sort((a, b) => b.nombreProjets - a.nombreProjets)
    .slice(0, 6);
}

totalProjetsTousClients(): number {
  return this.clients().reduce((sum, c) => sum + (c.nombreProjets || 0), 0);
}

getGaugeRings(): { r: number; colorClass: string; nom: string; nombreProjets: number }[] {
  const items = this.getClientsByProjets();
  if (items.length === 0) return [];
  const outerR = 84;
  const STEP = 12;
  const minInnerR = outerR - (items.length - 1) * STEP;
  const effectiveOuterR = minInnerR < 15 ? outerR + (15 - minInnerR) : outerR;
  return items.map((item, i) => ({
    r: effectiveOuterR - i * STEP,
    colorClass: this.GAUGE_COLORS[i % this.GAUGE_COLORS.length].colorClass,
    nom: item.client.nom,
    nombreProjets: item.nombreProjets
  }));
}

getGaugeDashFull(index: number, radius: number): string {
  const total = 2 * Math.PI * radius;
  const pct = this.getGaugePct(index);
  const visible = total * (pct / 100);
  return `${visible.toFixed(2)} ${total}`;
}

getGaugePct(index: number): number {
  const items = this.getClientsByProjets();
  const item = items[index];
  const total = this.totalProjetsTousClients();
  if (!item || total === 0) return 0;
  return Math.round((item.nombreProjets / total) * 100);
}

getGaugeLegend(): { nom: string; nombreProjets: number; ringCouleur: string; pct: number }[] {
  const items = this.getClientsByProjets();
  return items.map((item, i) => ({
    nom: item.client.nom,
    nombreProjets: item.nombreProjets,
    ringCouleur: this.GAUGE_COLORS[i % this.GAUGE_COLORS.length].hex,
    pct: this.getGaugePct(i)
  }));
}

// ── Line chart : nombre de clients dans le temps (remplace "Activités terminées") ──
private getMonthlyPeriodPoints(y: number, m: number): { year: number; month: number; day: number }[] {
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const nextM = m === 11 ? 0 : m + 1;
  const nextY = m === 11 ? y + 1 : y;
  const daysInNextMonth = new Date(nextY, nextM + 1, 0).getDate();

  const points: { year: number; month: number; day: number }[] = [];
  for (let d = 1; d <= daysInMonth; d += 8) points.push({ year: y, month: m, day: d });
  if (points[points.length - 1]?.day !== daysInMonth) points.push({ year: y, month: m, day: daysInMonth });
  const halfNext = Math.floor(daysInNextMonth / 2);
  for (let d = 1; d <= halfNext; d += 8) points.push({ year: nextY, month: nextM, day: d });
  return points;
}

private getClientsChartMax(): number {
  const points = this.getMonthlyPeriodPoints(this.lineYear(), this.lineMonthIdx());
  let max = 0;
  points.forEach(pt => {
    const dateFin = new Date(pt.year, pt.month, pt.day, 23, 59, 59);
    const count = this.clients().filter(c => c.createdAt && new Date(c.createdAt) <= dateFin).length;
    if (count > max) max = count;
  });
  return max;
}

private buildYAxisLabels(max: number): number[] {
  const step = Math.max(1, Math.ceil(max / 5));
  const labels: number[] = [];
  for (let i = 5; i >= 0; i--) labels.push(i * step);
  return labels;
}

getLineYLabels(): number[] {
  return this.buildYAxisLabels(this.getClientsChartMax());
}

getLinePoints2(): { x: number; y: number }[] {
  const points = this.getMonthlyPeriodPoints(this.lineYear(), this.lineMonthIdx());
  const yLabels = this.getLineYLabels();
  const yMax = yLabels[0] || 1;

  const counts = points.map(pt => {
    const dateFin = new Date(pt.year, pt.month, pt.day, 23, 59, 59);
    return this.clients().filter(c => c.createdAt && new Date(c.createdAt) <= dateFin).length;
  });

  return points.map((_, i) => ({
    x: 10 + (i / Math.max(points.length - 1, 1)) * (this.LINE_W - 20),
    y: this.LINE_H - 10 - (yMax > 0 ? (counts[i] / yMax) * (this.LINE_H - 20) : 0)
  }));
}

getLineXLabels2(): string[] {
  const points = this.getMonthlyPeriodPoints(this.lineYear(), this.lineMonthIdx());
  return points.map(pt => `${this.MOIS_LABELS[pt.month]}${pt.day}`);
}

getLinePath2(): string {
  const pts = this.getLinePoints2();
  if (!pts.length) return '';
  return pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
}

getLineAreaPath2(): string {
  const pts = this.getLinePoints2();
  if (!pts.length) return '';
  const line = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  return `${line} L${pts[pts.length - 1].x},${this.LINE_H} L${pts[0].x},${this.LINE_H} Z`;
}



/** ✅ NOUVEAU — Les 2 clients les plus récemment créés, pour la carte "Clients récents" */
getClientsRecents(): Client[] {
  return [...this.clients()]
    .filter(c => !!c.createdAt)
    .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
    .slice(0, 2);
}

/** ✅ NOUVEAU — % des projets (parmi tous les projets clients) qui appartiennent à un client actif */
pctProjetsClientsActifs(): number {
  const total = this.totalProjetsTousClients();
  if (total === 0) return 0;
  const actifs = this.clients()
    .filter(c => c.actif)
    .reduce((s, c) => s + (c.nombreProjets || 0), 0);
  return Math.round((actifs / total) * 100);
}

/** ✅ NOUVEAU — % de clients actifs sur le total des clients */
pctClientsActifs(): number {
  const total = this.clients().length;
  if (total === 0) return 0;
  return Math.round((this.statsActifs() / total) * 100);
}

/** ✅ NOUVEAU — dasharray d'une jauge semi-circulaire (demi-cercle, r donné) */
getSemiGaugeDash(pct: number, r: number): string {
  const total = Math.PI * r;
  const fill = total * (Math.max(0, Math.min(100, pct)) / 100);
  return `${fill.toFixed(2)} ${total.toFixed(2)}`;
}
}