// src/app/services/permission-context.service.ts — FINAL
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
        if (!this.keycloak.isInitialized()) { this.loaded.set(true); return; }
        const tokenParsed = this.keycloak.getTokenParsed();
        if (!tokenParsed) { this.loaded.set(true); return; }
        const rawProfilId = tokenParsed['profilId'];
        if (rawProfilId == null) { this.loaded.set(true); return; }
        this.profilId = Number(rawProfilId);
        if (isNaN(this.profilId)) { this.loaded.set(true); return; }
        await this.fetchPermissions();
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
                next: codes => { this.perms.set(new Set(codes)); this.loaded.set(true); resolve(); },
                error: ()    => { this.loaded.set(true); resolve(); }
            });
        });
    }

    private startPolling(): void {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(async () => { await this.fetchPermissions(); }, 30_000);
    }

    stopPolling(): void {
        if (this.refreshInterval) { clearInterval(this.refreshInterval); this.refreshInterval = null; }
    }

    async reload(): Promise<void> { this.loaded.set(false); await this.fetchPermissions(); }

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

    // ── Feuilles de temps ──
    // Peut lire sa propre feuille
    canReadOwnTS():    boolean { return this.can('TS_OWN_READ'); }
    // Peut créer sa propre feuille
    canCreateOwnTS():  boolean { return this.can('TS_OWN_CREATE'); }
    // Peut modifier sa propre feuille
    canUpdateOwnTS():  boolean { return this.can('TS_OWN_UPDATE'); }
    // Peut supprimer sa propre feuille
    canDeleteOwnTS():  boolean { return this.can('TS_OWN_DELETE'); }
    // Peut exporter sa propre feuille
    canExportOwnTS():  boolean { return this.can('TS_OWN_EXPORT'); }
    // Peut lire toutes les feuilles
    canReadAllTS():    boolean { return this.can('TS_ALL_READ'); }
    // Peut modifier toutes les feuilles
    canUpdateAllTS():  boolean { return this.can('TS_ALL_UPDATE'); }
    // Peut exporter toutes les feuilles
    canExportAllTS():  boolean { return this.can('TS_ALL_EXPORT'); }
    // Peut lire les feuilles du groupe
    canReadGroupTS():  boolean { return this.can('TS_GROUP_READ'); }
    // Peut modifier les feuilles du groupe
    canUpdateGroupTS(): boolean { return this.can('TS_GROUP_UPDATE'); }
    // Peut exporter les feuilles du groupe
    canExportGroupTS(): boolean { return this.can('TS_GROUP_EXPORT'); }
    // Peut valider / rejeter des feuilles de temps
    canValidateTS():   boolean { return this.can('TS_VALIDATE'); }

    // ── Navigation sidebar — Feuilles de temps ──

    /** Afficher le menu Feuilles de temps si au moins 1 permission TS_* */
    canSeeFTMenu(): boolean {
        return this.canReadOwnTS()   || this.canCreateOwnTS() ||
               this.canReadAllTS()   || this.canReadGroupTS() ||
               this.canValidateTS();
    }

    /** Voir "Ma semaine" */
    canSeeMaSemaine(): boolean { return this.canReadOwnTS() || this.canCreateOwnTS(); }

    /** Voir "Calendrier" */
    canSeeCalendrier(): boolean {
        return this.canReadOwnTS() || this.canReadAllTS() || this.canReadGroupTS();
    }

    /** Voir "Fiches de temps" */
    canSeeFiches(): boolean {
        return this.canReadAllTS() || this.canReadGroupTS() || this.canReadOwnTS();
    }

    /** Voir "Approbations" = TS_VALIDATE */
    canSeeApprobations(): boolean { return this.canValidateTS(); }

    // ── Helpers combinés ──
    canModifyDemande(isOwn: boolean): boolean {
        return this.can('DEMANDE_UPDATE_ALL') || (isOwn && this.can('DEMANDE_UPDATE_OWN'));
    }
    canDeleteDemande(isOwn: boolean): boolean {
        return this.can('DEMANDE_DELETE_ALL') || (isOwn && this.can('DEMANDE_DELETE_OWN'));
    }

    // ── Navigation sidebar ──
    canSeeDemandeMenu(): boolean {
        return this.canCreateDemande() || this.canViewOwnDemandes()
            || this.canViewAllDemandes() || this.canApproveDemande();
    }
    canSeeOwnDemandes():   boolean { return this.canViewOwnDemandes() || this.canCreateDemande(); }
    canSeeAdminDemandes(): boolean { return this.canViewAllDemandes() || this.canApproveDemande(); }
    canSeeTypesDemandes(): boolean { return this.canReadType() || this.canCreateType(); }


    canCreateReclamation():  boolean { return this.can("RECLAMATION_CREATE"); }
canViewOwnRec():         boolean { return this.can("RECLAMATION_VIEW_OWN"); }
canViewAllRec():         boolean { return this.can("RECLAMATION_VIEW_ALL"); }
canUpdateOwnRec():       boolean { return this.can("RECLAMATION_UPDATE_OWN"); }
canUpdateAllRec():       boolean { return this.can("RECLAMATION_UPDATE_ALL"); }
canDeleteOwnRec():       boolean { return this.can("RECLAMATION_DELETE_OWN"); }
canDeleteAllRec():       boolean { return this.can("RECLAMATION_DELETE_ALL"); }
canCommentRec():         boolean { return this.can("RECLAMATION_COMMENT"); }
canTreatRec():           boolean { return this.can("RECLAMATION_TREAT"); }
canExportRec():          boolean { return this.can("RECLAMATION_EXPORT"); }
canReadStatutRec():      boolean { return this.can("RECLAMATION_STATUT_READ"); }
canCreateStatutRec():    boolean { return this.can("RECLAMATION_STATUT_CREATE"); }
canUpdateStatutRec():    boolean { return this.can("RECLAMATION_STATUT_UPDATE"); }
canDeleteStatutRec():    boolean { return this.can("RECLAMATION_STATUT_DELETE"); }
canActivateStatutRec():  boolean { return this.can("RECLAMATION_STATUT_ACTIVATE"); }
canDeactivateStatutRec(): boolean { return this.can("RECLAMATION_STATUT_DEACTIVATE"); }
canReadServiceRec():     boolean { return this.can("RECLAMATION_SERVICE_READ"); }
canCreateServiceRec():   boolean { return this.can("RECLAMATION_SERVICE_CREATE"); }
canUpdateServiceRec():   boolean { return this.can("RECLAMATION_SERVICE_UPDATE"); }
canDeleteServiceRec():   boolean { return this.can("RECLAMATION_SERVICE_DELETE"); }
canActivateServiceRec(): boolean { return this.can("RECLAMATION_SERVICE_ACTIVATE"); }
canDeactivateServiceRec(): boolean { return this.can("RECLAMATION_SERVICE_DEACTIVATE"); }
 
canSeeReclamationMenu(): boolean {
  return this.canCreateReclamation() || this.canViewOwnRec() || this.canViewAllRec() || this.canTreatRec();
}
canSeeGererReclamations(): boolean { return this.canViewAllRec() || this.canTreatRec(); }
canSeeStatutReclamation(): boolean { return this.canReadStatutRec() || this.canCreateStatutRec(); }
canSeeServiceReclamation(): boolean { return this.canReadServiceRec() || this.canCreateServiceRec(); }
}