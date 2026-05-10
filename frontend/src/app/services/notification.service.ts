// src/app/services/notification.service.ts — REMPLACE
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject } from 'rxjs';
import { AppNotification } from '../shared/models/notification.model';
import { KeycloakService } from './keycloak.service';

const SSE_BASE = 'http://localhost:8085/api/notifications/sse';
const API_BASE = 'http://localhost:8085/api/notifications';

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private http     = inject(HttpClient);
    private keycloak = inject(KeycloakService);

    private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
    private unreadCountSubject   = new BehaviorSubject<number>(0);

    // ✅ Subject émettant chaque nouvelle notification en temps réel
    readonly newNotification$ = new Subject<AppNotification>();

    notifications$ = this.notificationsSubject.asObservable();
    unreadCount$   = this.unreadCountSubject.asObservable();

    private eventSource: EventSource | null = null;
    private currentKeycloakId: string | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    init(keycloakId: string): void {
        if (this.currentKeycloakId === keycloakId
            && this.eventSource?.readyState === EventSource.OPEN) return;
        this.currentKeycloakId = keycloakId;
        this.loadAll(keycloakId);
        this.connectSSEWithToken(keycloakId);
    }

    private async connectSSEWithToken(keycloakId: string): Promise<void> {
        try {
            const token = await this.keycloak.getValidToken();
            if (!token) { console.warn('[SSE] Pas de token'); return; }
            this.connectSSE(keycloakId, token);
        } catch (e) { console.error('[SSE] Erreur token:', e); }
    }

    private connectSSE(keycloakId: string, token: string): void {
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
        if (this.eventSource) { this.eventSource.close(); this.eventSource = null; }

        const url = `${SSE_BASE}/${keycloakId}?token=${encodeURIComponent(token)}`;
        this.eventSource = new EventSource(url);

        this.eventSource.addEventListener('connected', () => {
            this.loadUnreadCount(keycloakId);
        });

        this.eventSource.addEventListener('notification', (event: MessageEvent) => {
            try {
                const notif: AppNotification = JSON.parse(event.data);
                const current = this.notificationsSubject.getValue();
                if (!current.some(n => n.id === notif.id)) {
                    this.notificationsSubject.next([notif, ...current]);
                    this.recalculerUnread();
                    // ✅ Émettre l'événement pour que les composants réagissent
                    this.newNotification$.next(notif);
                }
            } catch (e) { console.error('Erreur parsing SSE:', e); }
        });

        this.eventSource.addEventListener('unread-count', (event: MessageEvent) => {
            const count = Number(event.data);
            if (!isNaN(count)) this.unreadCountSubject.next(count);
        });

        this.eventSource.onerror = () => {
            if (this.eventSource) { this.eventSource.close(); this.eventSource = null; }
            if (this.currentKeycloakId) {
                this.reconnectTimer = setTimeout(() => {
                    if (this.currentKeycloakId) this.connectSSEWithToken(this.currentKeycloakId);
                }, 5000);
            }
        };
    }

    private loadAll(keycloakId: string): void {
        this.http.get<AppNotification[]>(`${API_BASE}/${keycloakId}`).subscribe({
            next: notifs => { this.notificationsSubject.next(notifs); this.recalculerUnread(); },
            error: () => {}
        });
    }

    private recalculerUnread(): void {
        const count = this.notificationsSubject.getValue().filter(n => !n.lu).length;
        this.unreadCountSubject.next(count);
    }

    private loadUnreadCount(keycloakId: string): void {
        this.http.get<number>(`${API_BASE}/${keycloakId}/unread-count`).subscribe({
            next: count => this.unreadCountSubject.next(count),
            error: () => {}
        });
    }

    marquerLu(id: number): void {
        this.http.patch<AppNotification>(`${API_BASE}/${id}/lu`, {}).subscribe({
            next: () => {
                const list = this.notificationsSubject.getValue().map(n => n.id === id ? { ...n, lu: true } : n);
                this.notificationsSubject.next(list);
                this.recalculerUnread();
            },
            error: () => {}
        });
    }

    marquerTousLus(): void {
        const kcId = this.currentKeycloakId;
        if (!kcId) return;
        this.http.patch(`${API_BASE}/${kcId}/tout-lire`, {}).subscribe({
            next: () => {
                const list = this.notificationsSubject.getValue().map(n => ({ ...n, lu: true }));
                this.notificationsSubject.next(list);
                this.unreadCountSubject.next(0);
            },
            error: () => {}
        });
    }

    supprimer(id: number): void {
        this.http.delete(`${API_BASE}/${id}`).subscribe({
            next: () => {
                const list = this.notificationsSubject.getValue().filter(n => n.id !== id);
                this.notificationsSubject.next(list);
                this.recalculerUnread();
            },
            error: () => {}
        });
    }

    supprimerToutes(): void {
        const kcId = this.currentKeycloakId;
        if (!kcId) return;
        this.http.delete(`${API_BASE}/${kcId}/toutes`).subscribe({
            next: () => { this.notificationsSubject.next([]); this.unreadCountSubject.next(0); },
            error: () => {}
        });
    }

    disconnect(): void {
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
        if (this.eventSource) { this.eventSource.close(); this.eventSource = null; }
        this.currentKeycloakId = null;
    }
}