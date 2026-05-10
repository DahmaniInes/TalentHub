// src/app/services/permission-context.service.ts — REMPLACE COMPLET
import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { KeycloakService } from './keycloak.service';

@Injectable({ providedIn: 'root' })
export class PermissionContextService {

    private perms  = signal<Set<string>>(new Set());
    readonly loaded = signal(false);

    private profilId: number | null = null;
    private refreshInterval: ReturnType<typeof setInterval> | null = null;

    constructor(
        private http: HttpClient,
        private keycloak: KeycloakService
    ) {}

    async load(): Promise<void> {
        if (this.loaded()) return;

        if (!this.keycloak.isInitialized()) {
            this.loaded.set(true);
            return;
        }

        const tokenParsed = this.keycloak.getTokenParsed();
        if (!tokenParsed) { this.loaded.set(true); return; }

        const rawProfilId = tokenParsed['profilId'];
        if (rawProfilId == null) { this.loaded.set(true); return; }

        this.profilId = Number(rawProfilId);
        if (isNaN(this.profilId)) { this.loaded.set(true); return; }

        await this.fetchPermissions();

        // ✅ Polling toutes les 30 secondes pour détecter les changements de permissions
        this.startPolling();
    }

    private async fetchPermissions(): Promise<void> {
        const token = await this.keycloak.getValidToken();
        if (!token || !this.profilId) return;

        return new Promise(resolve => {
            this.http.get<string[]>(
                `http://localhost:8085/api/profil-permissions/profil/${this.profilId}/codes`,
                { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
            ).subscribe({
                next: codes => {
                    this.perms.set(new Set(codes));
                    this.loaded.set(true);
                    resolve();
                },
                error: () => { this.loaded.set(true); resolve(); }
            });
        });
    }

    // ✅ Polling toutes les 30s — capte les modifications sans rechargement
    private startPolling(): void {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(async () => {
            await this.fetchPermissions();
        }, 30_000);
    }

    stopPolling(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // ✅ Forcer un rechargement immédiat (après modification de permissions)
    async reload(): Promise<void> {
        this.loaded.set(false);
        await this.fetchPermissions();
    }

    can(code: string): boolean { return this.perms().has(code); }
    getAll(): Set<string>      { return this.perms(); }

    // ── Demandes ──
    canCreateDemande():     boolean { return this.can('DEMANDE_CREATE'); }
    canViewAllDemandes():   boolean { return this.can('DEMANDE_VIEW_ALL'); }
    canViewOwnDemandes():   boolean { return this.can('DEMANDE_VIEW_OWN'); }
    canUpdateAllDemandes(): boolean { return this.can('DEMANDE_UPDATE_ALL'); }
    canUpdateOwnDemandes(): boolean { return this.can('DEMANDE_UPDATE_OWN'); }
    canDeleteAllDemandes(): boolean { return this.can('DEMANDE_DELETE_ALL'); }
    canDeleteOwnDemandes(): boolean { return this.can('DEMANDE_DELETE_OWN'); }
    canApproveDemande():    boolean { return this.can('DEMANDE_APPROVE'); }
    canRejectDemande():     boolean { return this.can('DEMANDE_REJECT'); }
    canExportDemandes():    boolean { return this.can('DEMANDE_EXPORT'); }

    // ── Types demandes ──
    canCreateType():     boolean { return this.can('DEMANDE_TYPE_CREATE'); }
    canReadType():       boolean { return this.can('DEMANDE_TYPE_READ'); }
    canUpdateType():     boolean { return this.can('DEMANDE_TYPE_UPDATE'); }
    canDeleteType():     boolean { return this.can('DEMANDE_TYPE_DELETE'); }
    canActivateType():   boolean { return this.can('DEMANDE_TYPE_ACTIVATE'); }
    canDeactivateType(): boolean { return this.can('DEMANDE_TYPE_DEACTIVATE'); }
    canExportTypes():    boolean { return this.can('DEMANDE_TYPE_EXPORT'); }

    // ── Notifications ──
    canViewNotifs():      boolean { return this.can('NOTIFICATION_VIEW_OWN'); }
    canMarkRead():        boolean { return this.can('NOTIFICATION_MARK_READ'); }
    canDeleteOwnNotifs(): boolean { return this.can('NOTIFICATION_DELETE_OWN'); }
    canDeleteAllNotifs(): boolean { return this.can('NOTIFICATION_DELETE_ALL'); }
    canExportNotifs():    boolean { return this.can('NOTIFICATION_EXPORT'); }
    canSendManualNotif(): boolean { return this.can('NOTIFICATION_SEND_MANUAL'); }

    // ── Helpers combinés ──
    canModifyDemande(isOwn: boolean): boolean {
        return this.can('DEMANDE_UPDATE_ALL') ||
               (isOwn && this.can('DEMANDE_UPDATE_OWN'));
    }
    canDeleteDemande(isOwn: boolean): boolean {
        return this.can('DEMANDE_DELETE_ALL') ||
               (isOwn && this.can('DEMANDE_DELETE_OWN'));
    }

    // ── Navigation sidebar ──
    canSeeDemandeMenu(): boolean {
        return this.canCreateDemande() || this.canViewOwnDemandes()
            || this.canViewAllDemandes() || this.canApproveDemande();
    }
    canSeeOwnDemandes():   boolean { return this.canViewOwnDemandes() || this.canCreateDemande(); }
    canSeeAdminDemandes(): boolean { return this.canViewAllDemandes() || this.canApproveDemande(); }
    canSeeTypesDemandes(): boolean { return this.canReadType() || this.canCreateType(); }
}