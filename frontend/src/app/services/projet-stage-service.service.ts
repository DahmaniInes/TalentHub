import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Projet, ProjetRequest } from '../shared/models/projet.model';
import { Activite, ActiviteRequest } from '../shared/models/activite.model';

@Injectable({ providedIn: 'root' })
export class ProjetStageService {

  private http = inject(HttpClient);
  private apiProjets   = 'http://localhost:8085/api/application/projets';
  private apiActivites = 'http://localhost:8085/api/application/activites';
  private apiMembres   = 'http://localhost:8085/api/application/membres-equipe';

  // ── Projets de stage (typeProjetId = 3) ──────────────────────

  getAll(): Observable<Projet[]> {
    return this.http.get<Projet[]>(`${this.apiProjets}/stage`);
  }

  getById(id: number): Observable<Projet> {
    return this.http.get<Projet>(`${this.apiProjets}/${id}`);
  }

  getByStagiaire(utilisateurId: number): Observable<Projet[]> {
    return this.http.get<Projet[]>(
        `${this.apiProjets}/stagiaire/${utilisateurId}`);
  }

  getBySuperviseur(superviseurId: number): Observable<Projet[]> {
    return this.http.get<Projet[]>(
        `${this.apiProjets}/superviseur/${superviseurId}`);
  }

  create(body: Partial<ProjetRequest> & { nom: string }): Observable<Projet> {
    // Force typeProjetId = 3 (STAGE_ACADEMIQUE)
    const payload: ProjetRequest = {
      ...body,
      typeProjetId:   3,
      statutProjetId: body.statutProjetId ?? 2  // 2 = EN_COURS par défaut
    };
    return this.http.post<Projet>(this.apiProjets, payload);
  }

  update(id: number, body: Partial<ProjetRequest>): Observable<Projet> {
    return this.http.put<Projet>(`${this.apiProjets}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiProjets}/${id}`);
  }

  // Assigner un stagiaire via MembreEquipe
  assignerAStagiaire(projetId: number, stagiaireId: number,
                     stageId?: number): Observable<any> {
    return this.http.post<any>(`${this.apiMembres}/stagiaire`, {
      projetId, utilisateurId: stagiaireId, stageId
    });
  }

  // ── Activités ─────────────────────────────────────────────────

  getActivitesByProjet(projetId: number): Observable<Activite[]> {
    return this.http.get<Activite[]>(
        `${this.apiActivites}/projet/${projetId}`);
  }

  getAllActivites(): Observable<Activite[]> {
    return this.http.get<Activite[]>(this.apiActivites);
  }

  createActivite(req: ActiviteRequest): Observable<Activite> {
    return this.http.post<Activite>(this.apiActivites, req);
  }

  updateActivite(id: number, req: Partial<ActiviteRequest>): Observable<Activite> {
    return this.http.put<Activite>(`${this.apiActivites}/${id}`, req);
  }

  deleteActivite(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiActivites}/${id}`);
  }
}