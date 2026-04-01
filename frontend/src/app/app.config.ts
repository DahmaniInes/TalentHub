import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER  } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors  } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { KeycloakService } from './services/keycloak.service';


function initKeycloak(keycloak: KeycloakService) {
  return () => keycloak.init();
}

// ✅ CORRECT — un seul appel avec l'intercepteur
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])), // ← un seul !
    {
      provide: APP_INITIALIZER,
      useFactory: initKeycloak,
      deps: [KeycloakService],
      multi: true
    }
  ]
};
