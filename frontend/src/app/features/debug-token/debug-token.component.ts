// Dans n'importe quel composant — pour tester
import { Component, inject, OnInit } from '@angular/core';
import { KeycloakService } from '../../services/keycloak.service';

@Component({
  selector: 'app-debug-token',
  standalone: true,
  template: `
    <div style="position:fixed;bottom:10px;right:10px;z-index:9999;
                background:#1e293b;color:white;padding:12px;border-radius:8px;
                font-family:monospace;font-size:11px;max-width:400px">
      <div><b>profilId dans token:</b> {{ profilId }}</div>
      <div><b>Permissions:</b> {{ permissions }}</div>
      <button (click)="refresh()" 
              style="margin-top:8px;padding:4px 8px;cursor:pointer">
        🔄 Forcer déco/reco
      </button>
    </div>
  `
})
export class DebugTokenComponent implements OnInit {
    private keycloak = inject(KeycloakService);
    profilId = 'non trouvé';
    permissions = '';

    ngOnInit() {
        const parsed = this.keycloak.getTokenParsed();
        this.profilId = parsed?.['profilId'] ?? 'ABSENT';
        console.log('[Debug] Token complet:', parsed);
    }

    refresh() {
        this.keycloak.logout();
    }
}