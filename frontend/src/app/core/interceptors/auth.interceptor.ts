// src/app/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { KeycloakService } from '../../services/keycloak.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloak = inject(KeycloakService);

  // Ne pas intercepter les requêtes OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return next(req);
  }

  return from(keycloak.getValidToken()).pipe(
    switchMap(token => {
      if (token) {
        const cloned = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` }
        });
        return next(cloned);
      }
      // Pas de token disponible → laisser passer sans Authorization
      // (le backend renverra 401 si nécessaire)
      return next(req);
    })
  );
};