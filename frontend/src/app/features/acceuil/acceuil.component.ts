import { Component } from '@angular/core';
import { GraduationCapComponent } from '../graduation-cap/graduation-cap.component';

@Component({
  selector: 'app-acceuil',
  standalone: true,
  imports: [GraduationCapComponent],   // ← c'était vide avant
  templateUrl: './acceuil.component.html',
  styleUrl: './acceuil.component.css'
})
export class AcceuilComponent {}