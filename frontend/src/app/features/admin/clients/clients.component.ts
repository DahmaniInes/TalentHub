// clients.component.ts — VERSION DT-*
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../../services/client.service';
import { UiService } from '../../../services/ui.service';
import { ErrorService } from '../../../services/error.service';
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

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredClients().length / this.pageSize())));
  pagesArray = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
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
    this.editingClient.set(null);
    this.activeTab.set('general');
    this.form.set({ nom:'', devise:'TND', couleur:'#6366f1', typeBudget:'ILLIMITE', visible:true, facturable:true, actif:true });
    this.showModal.set(true);
  }

  openEdit(client: Client): void {
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
  closeMenu(): void { this.openMenuId.set(null); }

  getInitiales(nom: string): string { return (nom||'').split(' ').slice(0,2).map(w=>w.charAt(0).toUpperCase()).join(''); }
  getCouleurStyle(couleur?: string): string { return couleur || '#6366f1'; }
}