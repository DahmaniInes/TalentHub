// src/app/services/stagiaire-context.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StagiaireContextService {
  projetId  = signal<number | null>(null);
  projetNom = signal<string>('Mon projet');
}