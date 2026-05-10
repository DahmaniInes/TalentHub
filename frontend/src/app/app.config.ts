// app.config.ts — REMPLACE
import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { KeycloakService } from './services/keycloak.service';
import { PermissionContextService } from './services/permission-context.service';

function initApp(
    keycloak: KeycloakService,
    permCtx: PermissionContextService
) {
    return async () => {
        // ✅ 1. Init Keycloak d'abord
        await keycloak.init();

        // ✅ 2. Debug token après init
        keycloak.debugToken();

        // ✅ 3. Charger permissions
        await permCtx.load();

        console.log('[App] Init terminé. Permissions:',
            Array.from(permCtx.getAll()));
    };
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        {
            provide: APP_INITIALIZER,
            useFactory: initApp,
            deps: [KeycloakService, PermissionContextService],
            multi: true
        }
    ]
};