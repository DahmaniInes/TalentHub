import { Component, ViewEncapsulation } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [NgFor],
  standalone:true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  encapsulation: ViewEncapsulation.None   // ← clé du fix
})
export class DashboardComponent {

  employees = [
    { name: 'Alice Martin',   dept: 'Ressources Humaines', status: 'Actif',   statusClass: 'emp-badge active',   avatar: 'https://i.pravatar.cc/40?img=1' },
    { name: 'Mohamed Ali',    dept: 'Informatique',        status: 'Congé',   statusClass: 'emp-badge leave',    avatar: 'https://i.pravatar.cc/40?img=2' },
    { name: 'Sophie Bernard', dept: 'Finance',             status: 'Actif',   statusClass: 'emp-badge active',   avatar: 'https://i.pravatar.cc/40?img=5' },
    { name: 'Karim Boulifa',  dept: 'Marketing',           status: 'Inactif', statusClass: 'emp-badge inactive', avatar: 'https://i.pravatar.cc/40?img=7' },
    { name: 'Laura Dupont',   dept: 'Juridique',           status: 'Actif',   statusClass: 'emp-badge active',   avatar: 'https://i.pravatar.cc/40?img=9' },
  ];

  activities = [
    { icon: '👤', iconClass: 'activity-icon purple', text: 'Nouvel employé ajouté : Thomas Leclerc', time: 'Il y a 5 minutes' },
    { icon: '📋', iconClass: 'activity-icon blue',   text: 'Contrat mis à jour pour Alice Martin',   time: 'Il y a 1 heure'   },
    { icon: '✅', iconClass: 'activity-icon green',  text: 'Congé approuvé pour Mohamed Ali',        time: 'Il y a 2 heures'  },
    { icon: '💰', iconClass: 'activity-icon pink',   text: 'Paie traitée pour 120 employés',         time: 'Hier à 18:00'     },
  ];

  departments = [
    { name: 'Informatique',        count: 32, percent: 80, color: 'purple' },
    { name: 'Finance',             count: 24, percent: 60, color: 'blue'   },
    { name: 'Ressources Humaines', count: 18, percent: 45, color: 'green'  },
    { name: 'Marketing',           count: 15, percent: 38, color: 'pink'   },
    { name: 'Juridique',           count: 10, percent: 25, color: 'yellow' },
  ];
}