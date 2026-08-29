// src/app/services/jours-feries.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';

export interface JourFerie {
  date: string;
  localName: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class JoursFeriesService {
  private http = inject(HttpClient);

  // ✅ NOUVEAU — traduction française, basée sur le nom anglais officiel
  // (stable d'une année à l'autre), puisque Nager.Date ne fournit que
  // l'anglais et la langue locale (arabe pour TN), jamais le français.
  private readonly TRADUCTIONS_FR: Record<string, string> = {
    "New Year's Day": "Jour de l'an",
    "Independence Day": "Fête de l'Indépendance",
    "Martyrs' Day": "Journée des Martyrs",
    "Labour Day": "Fête du Travail",
    "Republic Day": "Fête de la République",
    "Women's Day": "Fête de la Femme",
    "Evacuation Day": "Journée de l'Évacuation",
    "Revolution Day": "Journée de la Révolution",
    "Eid al-Fitr": "Aïd el-Fitr",
    "Eid al-Fitr Holiday": "Aïd el-Fitr (2ème jour)",
    "Eid al-Adha": "Aïd el-Idha",
    "Eid al-Adha Holiday": "Aïd el-Idha (2ème jour)",
    "Islamic New Year": "Nouvel An Hégirien",
    "Prophet's Birthday": "Mouled"
  };

  private traduire(nomAnglais: string): string {
    return this.TRADUCTIONS_FR[nomAnglais] ?? nomAnglais; // fallback : anglais si pas dans le dico
  }

  getParAnnee(annee: number): Observable<JourFerie[]> {
    const url = `https://date.nager.at/api/v3/PublicHolidays/${annee}/TN`;
    return this.http.get<any[]>(url).pipe(
      map(list => list.map(j => ({
        date: j.date,
        localName: this.traduire(j.name), // ✅ français au lieu de l'arabe
        name: j.name
      }))),
      catchError(() => of([]))
    );
  }
}