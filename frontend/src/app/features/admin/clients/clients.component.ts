// src/app/features/clients/clients.component.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClientService } from '../../../services/client.service';
import { UiService } from '../../../services/ui.service';
import { ErrorService } from '../../../services/error.service';
import { Client, ClientRequest } from '../../../shared/models/client.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.css']
})
export class ClientsComponent implements OnInit {
  private clientSvc  = inject(ClientService);
  private errorSvc   = inject(ErrorService);
  readonly ui        = inject(UiService);

  clients   = signal<Client[]>([]);
  loading   = signal(true);
  search    = signal('');

  // Modal
  showModal     = signal(false);
  editingClient = signal<Client | null>(null);
  activeTab     = signal<'general' | 'contact' | 'finance' | 'adresse'>('general');

  form = signal<ClientRequest>({
    nom: '', description: '', compte: '', idTva: '', devise: 'TND',
    couleur: '#6366f1', contact: '', courriel: '', pageAccueil: '',
    mobile: '', telephone: '', fax: '',
    budget: undefined, quotaHoraire: undefined, typeBudget: 'MENSUEL',
    nomSociete: '', codePostal: '', ville: '', pays: 'Tunisie',
    fuseauHoraire: 'Africa/Tunis', visible: true, facturable: true, actif: true
  });

  filteredClients = computed(() => {
    const q = this.search().toLowerCase();
    if (!q) return this.clients();
    return this.clients().filter(c =>
      c.nom.toLowerCase().includes(q) ||
      (c.contact || '').toLowerCase().includes(q) ||
      (c.ville || '').toLowerCase().includes(q)
    );
  });

  readonly COULEURS = [
    '#6366f1', '#8b5cf6', '#c026d3', '#ec4899',
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#10b981', '#06b6d4', '#3b82f6', '#64748b'
  ];

  readonly TYPE_BUDGETS = ['MENSUEL', 'TRIMESTRIEL', 'ANNUEL', 'ILLIMITE'];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.clientSvc.getAll().subscribe({
      next: data => { this.clients.set(data); this.loading.set(false); },
      error: () => { this.ui.error('Erreur chargement clients.'); this.loading.set(false); }
    });
  }

  openAdd(): void {
    this.editingClient.set(null);
    this.resetForm();
    this.activeTab.set('general');
    this.showModal.set(true);
  }

  openEdit(client: Client): void {
    this.editingClient.set(client);
    this.form.set({
      nom: client.nom, description: client.description || '',
      compte: client.compte || '', idTva: client.idTva || '',
      devise: client.devise || 'TND', couleur: client.couleur || '#6366f1',
      contact: client.contact || '', courriel: client.courriel || '',
      pageAccueil: client.pageAccueil || '', mobile: client.mobile || '',
      telephone: client.telephone || '', fax: client.fax || '',
      budget: client.budget, quotaHoraire: client.quotaHoraire,
      typeBudget: client.typeBudget || 'MENSUEL',
      nomSociete: client.nomSociete || '', codePostal: client.codePostal || '',
      ville: client.ville || '', pays: client.pays || 'Tunisie',
      fuseauHoraire: client.fuseauHoraire || 'Africa/Tunis',
      visible: client.visible, facturable: client.facturable, actif: client.actif
    });
    this.activeTab.set('general');
    this.showModal.set(true);
  }

  save(): void {
    const f = this.form();
    if (!f.nom?.trim()) { this.ui.warning('Le nom du client est obligatoire.'); return; }
    const editing = this.editingClient();
    const obs = editing
      ? this.clientSvc.update(editing.id, f)
      : this.clientSvc.create(f);
    obs.subscribe({
      next: () => {
        this.ui.success(editing ? 'Client mis à jour.' : 'Client créé.');
        this.closeModal();
        this.load();
      },
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  delete(client: Client): void {
    this.ui.confirm({
      title: 'Supprimer le client',
      message: `Supprimer "${client.nom}" et tous ses projets associés ?`,
      confirmLabel: 'Supprimer', type: 'danger',
      onConfirm: () => {
        this.clientSvc.delete(client.id).subscribe({
          next: () => { this.ui.success('Client supprimé.'); this.load(); },
          error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
        });
      }
    });
  }

  toggleActif(client: Client): void {
    this.clientSvc.toggleActif(client.id).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => this.ui.error(this.errorSvc.parse(err).message)
    });
  }

  closeModal(): void { this.showModal.set(false); this.editingClient.set(null); }

  private resetForm(): void {
    this.form.set({
      nom: '', description: '', compte: '', idTva: '', devise: 'TND',
      couleur: '#6366f1', contact: '', courriel: '', pageAccueil: '',
      mobile: '', telephone: '', fax: '',
      budget: undefined, quotaHoraire: undefined, typeBudget: 'MENSUEL',
      nomSociete: '', codePostal: '', ville: '', pays: 'Tunisie',
      fuseauHoraire: 'Africa/Tunis', visible: true, facturable: true, actif: true
    });
  }

  getInitiales(nom: string): string {
    return nom.substring(0, 2).toUpperCase();
  }

  getCouleurStyle(couleur?: string): string {
    return couleur || '#6366f1';
  }
}