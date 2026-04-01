import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KeycloakService } from '../../services/keycloak.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './complete-profile.component.html',
  styleUrls: ['./complete-profile.component.css']
})
export class CompleteProfileComponent implements OnInit {

  private keycloak = inject(KeycloakService);
  private userService = inject(UserService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  profileForm: FormGroup;
  loading = signal(false);
  success = signal(false);
  selectedFile: File | null = null;     // ← Pour stocker le fichier sélectionné

  constructor() {
    this.profileForm = this.fb.group({
      dateNaissance: [''],
      telephone: [''],
      adresse: [''],
      dateFinContrat: [''],
      poste: [''],
      departement: ['']
      // photoUrl est géré via le fichier, on ne le met plus dans le form
    });
  }

  ngOnInit(): void {
    // Optionnel : charger les données existantes de l'utilisateur
  }

  // ====================== NOUVELLE MÉTHODE ======================
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Optionnel : validation du type et de la taille
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        alert('L\'image ne doit pas dépasser 5MB');
        return;
      }
      this.selectedFile = file;
    }
  }

  onSubmit(): void {
    this.loading.set(true);

    const formData = new FormData();

    // Ajouter les champs du formulaire en JSON
    formData.append('updates', new Blob([JSON.stringify(this.profileForm.value)], {
      type: 'application/json'
    }));

    // Ajouter la photo si elle existe
    if (this.selectedFile) {
      formData.append('photo', this.selectedFile);
    }

    this.userService.updateUserProfileWithPhoto(formData).subscribe({
      next: () => {
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/dashboard']), 1500);
      },
      error: (err: any) => {
        console.error('Erreur mise à jour profil', err);
        alert('Une erreur est survenue lors de la mise à jour');
      },
      complete: () => this.loading.set(false)
    });
  }

  skip(): void {
    this.router.navigate(['/dashboard']);
  }
}