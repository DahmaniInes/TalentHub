// src/app/features/admin/profil-permissions/assigned-count.pipe.ts
// Pipe utilisé dans le template pour compter les permissions assignées d'un groupe
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'ppAssignedCount', standalone: true })
export class AssignedCountPipe implements PipeTransform {
  transform(permissions: { assigned: boolean }[]): number {
    return permissions.filter(p => p.assigned).length;
  }
}