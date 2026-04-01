// src/app/services/keycloak.service.ts
import { Injectable } from '@angular/core';
import Keycloak, { KeycloakConfig, KeycloakInitOptions } from 'keycloak-js';

@Injectable({ providedIn: 'root' })
export class KeycloakService {
  private keycloak!: InstanceType<typeof Keycloak>;
  private initialized = false;

  async init(): Promise<boolean> {
    if (this.initialized) return true;  // ✅ évite double init

    const config: KeycloakConfig = {
      url: 'http://localhost:8080',
      realm: 'talenthub',
      clientId: 'talenthub-frontend'
    };

    this.keycloak = new Keycloak(config);

    const initOptions: KeycloakInitOptions = {
      onLoad: 'login-required',
      checkLoginIframe: false
    };

    const result = await this.keycloak.init(initOptions);
    this.initialized = true;
    return result;
  }

  async getValidToken(): Promise<string | undefined> {
    if (!this.keycloak) {
      console.error('Keycloak non initialisé');
      return undefined;
    }
  
    try {
      const refreshed = await this.keycloak.updateToken(30);
      // optionnel : log utile en dev
      // if (refreshed) console.log('Token rafraîchi');
      return this.keycloak.token;
    } catch {
      // Token expiré et refresh impossible → rediriger vers login
      console.warn('Session expirée, redirection login...');
      await this.keycloak.login();
      return undefined; // ← jamais atteint après login(), mais TypeScript content
    }
  }
  




  getUsername(): string {
    return this.keycloak?.tokenParsed?.['preferred_username'] || '';
  }

  getRoles(): string[] {
    return this.keycloak?.tokenParsed?.['realm_access']?.roles || [];
  }

  isAdmin(): boolean {
    return this.getRoles().includes('ADMIN');
  }

  isInitialized(): boolean {
    return this.initialized;
  }
  getKeycloakUserId(): string | null {
    return this.keycloak?.subject || null;   // 'subject' = user ID dans Keycloak
  }

  // Ajouter ces méthodes dans votre KeycloakService existant



getFullName(): string {
  const t = this.keycloak?.tokenParsed;
  if (!t) return '';
  return ((t['given_name'] ?? '') + ' ' + (t['family_name'] ?? '')).trim();
}

logout(): void {
  this.keycloak?.logout({
    redirectUri: window.location.origin  // retour à la page login Keycloak
  });
}
}