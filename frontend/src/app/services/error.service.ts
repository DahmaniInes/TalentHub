import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

export interface AppError {
  message: string;
  code: string;
}

@Injectable({ providedIn: 'root' })
export class ErrorService {

  parse(err: HttpErrorResponse): AppError {
    if (!navigator.onLine) {
      return { message: 'Pas de connexion internet.', code: 'OFFLINE' };
    }
    if (err.status === 0) {
      return { message: 'Impossible de contacter le serveur.', code: 'NO_RESPONSE' };
    }

    // ✅ HttpClient parse automatiquement le JSON → err.error est déjà un objet.
    // On ne tente JSON.parse que si c'est vraiment une string (cas rare : text/plain).
    let body: any = err.error;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = { message: body }; }
    }

    // ✅ Cherche le message dans les champs courants du body
    const msg: string =
      body?.message ||
      body?.error   ||
      body?.detail  ||
      null;

    if (err.status === 409) {
      return {
        message: msg || 'Cet email est déjà utilisé par un autre compte.',
        code: 'DUPLICATE'
      };
    }
    if (err.status === 404) {
      return { message: msg || 'Ressource introuvable.', code: 'NOT_FOUND' };
    }
    if (err.status === 403) {
      const body = err.error;
      if (body?.message) {
          return { message: body.message, code: body.permission };
      }
      return {
          message: "Vous n'avez pas la permission d'effectuer cette action.",
          code: 'PERMISSION_DENIED'
      };
  }
    if (err.status === 401) {
      return { message: msg || 'Session expirée. Veuillez vous reconnecter.', code: 'UNAUTHORIZED' };
    }
    if (err.status === 400) {
      if (body?.fields) {
        const first = Object.entries(body.fields)[0] as [string, string];
        return { message: `${first[0]} : ${first[1]}`, code: 'VALIDATION' };
      }
      return { message: msg || 'Données invalides.', code: 'BAD_REQUEST' };
    }
    if (err.status >= 500) {
      return { message: msg || 'Erreur serveur. Réessayez plus tard.', code: 'SERVER_ERROR' };
    }
    return { message: msg || 'Erreur inattendue.', code: 'UNKNOWN' };
  }
}