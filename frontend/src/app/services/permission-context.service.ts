// src/app/services/permission-context.service.ts — COMPLET FINAL
import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { KeycloakService } from './keycloak.service';

@Injectable({ providedIn: 'root' })
export class PermissionContextService {

    private perms   = signal<Set<string>>(new Set());
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
                error: ()   => { this.loaded.set(true); resolve(); }
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

    // ════════════════════════════════════════════════════════════════
    // DEMANDES
    // ════════════════════════════════════════════════════════════════

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

    canModifyDemande(isOwn: boolean): boolean {
        return this.can('DEMANDE_UPDATE_ALL') || (isOwn && this.can('DEMANDE_UPDATE_OWN'));
    }
    canDeleteDemande(isOwn: boolean): boolean {
        return this.can('DEMANDE_DELETE_ALL') || (isOwn && this.can('DEMANDE_DELETE_OWN'));
    }

    canSeeDemandeMenu():   boolean {
        return this.canCreateDemande() || this.canViewOwnDemandes()
            || this.canViewAllDemandes() || this.canApproveDemande();
    }
    canSeeOwnDemandes():   boolean { return this.canViewOwnDemandes() || this.canCreateDemande(); }
    canSeeAdminDemandes(): boolean { return this.canViewAllDemandes() || this.canApproveDemande(); }
    canSeeTypesDemandes(): boolean { return this.canReadType() || this.canCreateType(); }

    // ── Types demandes ──
    canCreateType():     boolean { return this.can('DEMANDE_TYPE_CREATE'); }
    canReadType():       boolean { return this.can('DEMANDE_TYPE_READ'); }
    canUpdateType():     boolean { return this.can('DEMANDE_TYPE_UPDATE'); }
    canDeleteType():     boolean { return this.can('DEMANDE_TYPE_DELETE'); }
    canActivateType():   boolean { return this.can('DEMANDE_TYPE_ACTIVATE'); }
    canDeactivateType(): boolean { return this.can('DEMANDE_TYPE_DEACTIVATE'); }
    canExportTypes():    boolean { return this.can('DEMANDE_TYPE_EXPORT'); }

    // ════════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ════════════════════════════════════════════════════════════════

    canViewNotifs():      boolean { return this.can('NOTIFICATION_VIEW_OWN'); }
    canMarkRead():        boolean { return this.can('NOTIFICATION_MARK_READ'); }
    canDeleteOwnNotifs(): boolean { return this.can('NOTIFICATION_DELETE_OWN'); }
    canDeleteAllNotifs(): boolean { return this.can('NOTIFICATION_DELETE_ALL'); }
    canExportNotifs():    boolean { return this.can('NOTIFICATION_EXPORT'); }
    canSendManualNotif(): boolean { return this.can('NOTIFICATION_SEND_MANUAL'); }

    // ════════════════════════════════════════════════════════════════
    // FEUILLES DE TEMPS
    // ════════════════════════════════════════════════════════════════

    canReadOwnTS():    boolean { return this.can('TS_OWN_READ'); }
    canCreateOwnTS():  boolean { return this.can('TS_OWN_CREATE'); }
    canUpdateOwnTS():  boolean { return this.can('TS_OWN_UPDATE'); }
    canDeleteOwnTS():  boolean { return this.can('TS_OWN_DELETE'); }
    canExportOwnTS():  boolean { return this.can('TS_OWN_EXPORT'); }
    canReadAllTS():    boolean { return this.can('TS_ALL_READ'); }
    canUpdateAllTS():  boolean { return this.can('TS_ALL_UPDATE'); }
    canExportAllTS():  boolean { return this.can('TS_ALL_EXPORT'); }
    canReadGroupTS():  boolean { return this.can('TS_GROUP_READ'); }
    canUpdateGroupTS(): boolean { return this.can('TS_GROUP_UPDATE'); }
    canExportGroupTS(): boolean { return this.can('TS_GROUP_EXPORT'); }
    canValidateTS():   boolean { return this.can('TS_VALIDATE'); }

    canSeeFTMenu(): boolean {
        return this.canReadOwnTS()  || this.canCreateOwnTS() ||
               this.canReadAllTS()  || this.canReadGroupTS() ||
               this.canValidateTS();
    }
    canSeeMaSemaine():   boolean { return this.canReadOwnTS() || this.canCreateOwnTS(); }
    canSeeCalendrier():  boolean { return this.canReadOwnTS() || this.canReadAllTS() || this.canReadGroupTS(); }
    canSeeFiches():      boolean { return this.canReadAllTS() || this.canReadGroupTS() || this.canReadOwnTS(); }
    canSeeApprobations(): boolean { return this.canValidateTS(); }

    // ════════════════════════════════════════════════════════════════
    // RÉCLAMATIONS
    // ════════════════════════════════════════════════════════════════

    canCreateReclamation():    boolean { return this.can('RECLAMATION_CREATE'); }
    canViewOwnRec():           boolean { return this.can('RECLAMATION_VIEW_OWN'); }
    canViewAllRec():           boolean { return this.can('RECLAMATION_VIEW_ALL'); }
    canUpdateOwnRec():         boolean { return this.can('RECLAMATION_UPDATE_OWN'); }
    canUpdateAllRec():         boolean { return this.can('RECLAMATION_UPDATE_ALL'); }
    canDeleteOwnRec():         boolean { return this.can('RECLAMATION_DELETE_OWN'); }
    canDeleteAllRec():         boolean { return this.can('RECLAMATION_DELETE_ALL'); }
    canCommentRec():           boolean { return this.can('RECLAMATION_COMMENT'); }
    canTreatRec():             boolean { return this.can('RECLAMATION_TREAT'); }
    canExportRec():            boolean { return this.can('RECLAMATION_EXPORT'); }
    canReadStatutRec():        boolean { return this.can('RECLAMATION_STATUT_READ'); }
    canCreateStatutRec():      boolean { return this.can('RECLAMATION_STATUT_CREATE'); }
    canUpdateStatutRec():      boolean { return this.can('RECLAMATION_STATUT_UPDATE'); }
    canDeleteStatutRec():      boolean { return this.can('RECLAMATION_STATUT_DELETE'); }
    canActivateStatutRec():    boolean { return this.can('RECLAMATION_STATUT_ACTIVATE'); }
    canDeactivateStatutRec():  boolean { return this.can('RECLAMATION_STATUT_DEACTIVATE'); }
    canReadServiceRec():       boolean { return this.can('RECLAMATION_SERVICE_READ'); }
    canCreateServiceRec():     boolean { return this.can('RECLAMATION_SERVICE_CREATE'); }
    canUpdateServiceRec():     boolean { return this.can('RECLAMATION_SERVICE_UPDATE'); }
    canDeleteServiceRec():     boolean { return this.can('RECLAMATION_SERVICE_DELETE'); }
    canActivateServiceRec():   boolean { return this.can('RECLAMATION_SERVICE_ACTIVATE'); }
    canDeactivateServiceRec(): boolean { return this.can('RECLAMATION_SERVICE_DEACTIVATE'); }

    canSeeReclamationMenu():    boolean {
        return this.canCreateReclamation() || this.canViewOwnRec()
            || this.canViewAllRec()        || this.canTreatRec();
    }
    canSeeGererReclamations():  boolean { return this.canViewAllRec() || this.canTreatRec(); }
    canSeeStatutReclamation():  boolean { return this.canReadStatutRec() || this.canCreateStatutRec(); }
    canSeeServiceReclamation(): boolean { return this.canReadServiceRec() || this.canCreateServiceRec(); }

    // ════════════════════════════════════════════════════════════════
    // PROJETS — Admin
    // ════════════════════════════════════════════════════════════════

    canCreateProject():     boolean { return this.can('PROJECT_CREATE'); }
    canDeleteAllProjects(): boolean { return this.can('PROJECT_DELETE_ALL'); }
    canViewAllProjects():   boolean { return this.can('PROJECT_VIEW_ALL'); }
    canEditAllProjects():   boolean { return this.can('PROJECT_EDIT_ALL'); }

    // ── Projets — Team Lead ──
    canViewLeadProjects():   boolean { return this.can('PROJECT_VIEW_LEAD'); }
    canEditLeadProjects():   boolean { return this.can('PROJECT_EDIT_LEAD'); }
    canManageLeadComments(): boolean { return this.can('PROJECT_COMMENTS_LEAD'); }

    // ── Projets — Membre ──
    canViewOwnProject():     boolean { return this.can('PROJECT_VIEW_OWN'); }
    canEditOwnProject():     boolean { return this.can('PROJECT_EDIT_OWN'); }
    canTrackTime():          boolean { return this.can('PROJECT_TIME_TRACK'); }
    canCommentProject():     boolean { return this.can('PROJECT_COMMENTS_CREATE'); }
    canViewProjectDetails(): boolean { return this.can('PROJECT_DETAILS_VIEW'); }

    // ── Agrégats projets ──
    canSeeAnyProject(): boolean {
        return this.canViewAllProjects() || this.canViewLeadProjects()
            || this.canViewOwnProject()  || this.canViewProjectDetails();
    }
    canEditAnyProject(): boolean {
        return this.canEditAllProjects() || this.canEditLeadProjects() || this.canEditOwnProject();
    }
    canCommentAnyProject(): boolean {
        return this.canCommentProject() || this.canManageLeadComments();
    }
    canSeeProjectMenu(): boolean { return this.canSeeAnyProject() || this.canCreateProject(); }

    // ════════════════════════════════════════════════════════════════
    // ACTIVITÉS — Admin
    // ════════════════════════════════════════════════════════════════

    canCreateActivity():      boolean { return this.can('ACTIVITY_CREATE'); }
    canDeleteAllActivities(): boolean { return this.can('ACTIVITY_DELETE_ALL'); }
    canEditAllActivities():   boolean { return this.can('ACTIVITY_EDIT_ALL'); }
    canViewAllActivities():   boolean { return this.can('ACTIVITY_VIEW_ALL'); }
    canManageAllTime():       boolean { return this.can('ACTIVITY_TIME_ALL'); }

    // ── Activités — Team Lead ──
    canViewLeadActivities(): boolean { return this.can('ACTIVITY_VIEW_LEAD'); }
    canEditLeadActivities(): boolean { return this.can('ACTIVITY_EDIT_LEAD'); }

    // ── Activités — Membre ──
    canViewOwnActivities(): boolean { return this.can('ACTIVITY_VIEW_OWN'); }
    canEditOwnActivities(): boolean { return this.can('ACTIVITY_EDIT_OWN'); }

    // ── Agrégats activités ──
    canSeeAnyActivity(): boolean {
        return this.canViewAllActivities() || this.canViewLeadActivities()
            || this.canViewOwnActivities() || this.canViewAllProjects()
            || this.canViewLeadProjects()  || this.canViewOwnProject();
    }
    canEditAnyActivity(): boolean {
        return this.canEditAllActivities() || this.canEditLeadActivities() || this.canEditOwnActivities();
    }
    canSeeActivityMenu(): boolean { return this.canSeeAnyActivity() || this.canCreateActivity(); }

    // ════════════════════════════════════════════════════════════════
    // ÉQUIPES (TEAMS)
    // ════════════════════════════════════════════════════════════════

    canCreateTeam():      boolean { return this.can('TEAM_CREATE'); }
    canDeleteTeam():      boolean { return this.can('TEAM_DELETE'); }
    canUpdateTeam():      boolean { return this.can('TEAM_UPDATE'); }
    canViewTeams():       boolean { return this.can('TEAM_VIEW') || this.can('TEAM_MEMBER_VIEW'); }
    canViewTeamMembers(): boolean { return this.can('TEAM_MEMBER_VIEW') || this.can('TEAM_VIEW'); }

    canSeeTeamsMenu(): boolean {
        return this.canViewTeams() || this.canCreateTeam()
            || this.canUpdateTeam() || this.canDeleteTeam();
    }

    // ════════════════════════════════════════════════════════════════
    // CLIENTS (CUSTOMER)
    // ════════════════════════════════════════════════════════════════

    canCreateCustomer():        boolean { return this.can('CUSTOMER_CREATE'); }
    canDeleteCustomer():        boolean { return this.can('CUSTOMER_DELETE'); }
    canViewCustomerDetails():   boolean { return this.can('CUSTOMER_DETAILS') || this.can('CUSTOMER_VIEW'); }
    canUpdateCustomer():        boolean { return this.can('CUSTOMER_UPDATE'); }
    canViewCustomers():         boolean { return this.can('CUSTOMER_VIEW') || this.can('CUSTOMER_DETAILS'); }

    canSeeClientsMenu(): boolean {
        return this.canViewCustomers()  || this.canCreateCustomer()
            || this.canUpdateCustomer() || this.canDeleteCustomer();
    }


    // ════════════════════════════════════════════════════════════════
  // USER_MANAGEMENT — Gestion des utilisateurs
  // ════════════════════════════════════════════════════════════════
  // ✅ USER_VIEW | USER_CREATE | USER_UPDATE_INFO | USER_DELETE
  //    USER_BULK_DELETE | USER_VIEW_GROUPS | USER_SECURE_PWD | USER_SECURE_TOGGLE
 
  /** Voir la liste des utilisateurs */
  canViewUsers():       boolean { return this.can('USER_VIEW'); }
  /** Créer un utilisateur (bouton + page /add-user) */
  canCreateUser():      boolean { return this.can('USER_CREATE'); }
  /** Modifier les infos (onglet Informations du slide-over) */
  canUpdateUserInfo():  boolean { return this.can('USER_UPDATE_INFO'); }
  /** Supprimer un utilisateur */
  canDeleteUser():      boolean { return this.can('USER_DELETE'); }
  /** Suppression en masse */
  canBulkDeleteUsers(): boolean { return this.can('USER_BULK_DELETE'); }
  /** Voir l'onglet Groupes dans le slide-over */
  canViewUserGroups():  boolean { return this.can('USER_VIEW_GROUPS'); }
  /** Réinitialiser le mot de passe */
  canResetPassword():   boolean { return this.can('USER_SECURE_PWD'); }
  /** Activer / Désactiver un compte */
  canToggleUserActif(): boolean { return this.can('USER_SECURE_TOGGLE'); }
 
  /** Menu Système visible si au moins USER_VIEW ou USER_CREATE */
  canSeeUserMenu(): boolean {
    return this.canViewUsers() || this.canCreateUser()
        || this.canUpdateUserInfo() || this.canDeleteUser();
  }
 
  // ════════════════════════════════════════════════════════════════
  // PROFIL_PERMISSION — Gestion de la matrice d'accès
  // ════════════════════════════════════════════════════════════════
  // ✅ PROFIL_PERM_VIEW | PROFIL_CREATE | PROFIL_UPDATE | PROFIL_DELETE
  //    PERMISSION_CREATE | PERMISSION_UPDATE | PERMISSION_DELETE | PROFIL_PERM_ASSIGN
 
  /** Consulter la page matrice */
  canViewProfilPerm():    boolean { return this.can('PROFIL_PERM_VIEW'); }
  /** Créer un profil */
  canCreateProfil():      boolean { return this.can('PROFIL_CREATE'); }
  /** Modifier un profil */
  canUpdateProfil():      boolean { return this.can('PROFIL_UPDATE'); }
  /** Supprimer un profil */
  canDeleteProfil():      boolean { return this.can('PROFIL_DELETE'); }
  /** Créer une permission */
  canCreatePermission():  boolean { return this.can('PERMISSION_CREATE'); }
  /** Modifier une permission */
  canUpdatePermission():  boolean { return this.can('PERMISSION_UPDATE'); }
  /** Supprimer une permission */
  canDeletePermission():  boolean { return this.can('PERMISSION_DELETE'); }
  /** Cocher/décocher les cases (assigner/désassigner) */
  canAssignProfil():      boolean { return this.can('PROFIL_PERM_ASSIGN'); }
 
  /** Menu Permissions visible si au moins PROFIL_PERM_VIEW */
  canSeePermissionsMenu(): boolean {
    return this.canViewProfilPerm() || this.canCreateProfil()
        || this.canCreatePermission() || this.canAssignProfil();
  }



  // Ajouter dans PermissionContextService

// ════ ESPACE STAGIAIRE ════
canViewAllInterns():     boolean { return this.can('INT_ADMIN_VIEW_ALL_INTERNS'); }
canAssignSupervisor():   boolean { return this.can('INT_ADMIN_ASSIGN_SUPERVISOR'); }
canCreateTypeStage():    boolean { return this.can('INT_TYPE_CREATE'); }
canViewTypeStage():      boolean { return this.can('INT_TYPE_VIEW'); }
canEditTypeStage():      boolean { return this.can('INT_TYPE_EDIT'); }
canDeleteTypeStage():    boolean { return this.can('INT_TYPE_DELETE'); }
canViewMyInterns():      boolean { return this.can('INT_SUPER_VIEW_MY_INTERNS'); }
canSupervise():          boolean { return this.can('INT_SUPER_CAN_SUPERVISE'); }

canSeeEspaceStagiaire(): boolean {
    return this.canViewAllInterns() || this.canViewMyInterns()
        || this.canViewTypeStage()  || this.canCreateTypeStage();
}
canSeeGestionStagiaires(): boolean { return this.canViewAllInterns() || this.canViewMyInterns(); }
canSeeTypeStageMenu():     boolean { return this.canViewTypeStage() || this.canCreateTypeStage(); }



}