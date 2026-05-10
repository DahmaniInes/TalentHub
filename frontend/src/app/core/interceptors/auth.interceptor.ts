// src/app/core/interceptors/auth.interceptor.ts — REMPLACE
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError, throwError } from 'rxjs';
import { KeycloakService } from '../../services/keycloak.service';
import { UiService } from '../../services/ui.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const keycloak = inject(KeycloakService);
    const ui       = inject(UiService);

    if (req.method === 'OPTIONS') return next(req);

    return from(keycloak.getValidToken()).pipe(
        switchMap(token => {
            const cloned = token
                ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
                : req;

            return next(cloned).pipe(
                catchError((err: HttpErrorResponse) => {

                    // ✅ Toast automatique sur 403 — pas de section dans la page
                    if (err.status === 403) {
                        const msg = err.error?.message
                            || "Vous n'avez pas la permission d'effectuer cette action.";
                        ui.error(msg);
                    }

                    // ✅ Toast sur 401
                    if (err.status === 401) {
                        ui.warning('Session expirée. Reconnexion...');
                        setTimeout(() => keycloak.logout(), 1500);
                    }

                    return throwError(() => err);
                })
            );
        })
    );
};