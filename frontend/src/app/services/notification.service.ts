// src/app/services/notification.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { AppNotification } from '../shared/models/notification.model';

// ✅ SSE direct au microservice (pas via gateway) — évite les timeouts et les 401
// ✅ Tout passe par le gateway — plus de connexion directe sur 8081
// ✅ Tout passe par le gateway — plus de connexion directe sur 8081
const SSE_BASE  = 'http://localhost:8085/api/notifications/sse';
const API_BASE  = 'http://localhost:8085/api/notifications';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);

  // ── Observables centraux ──
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  private unreadCountSubject   = new BehaviorSubject<number>(0);

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$   = this.unreadCountSubject.asObservable();

  private eventSource: EventSource | null = null;
  private currentKeycloakId: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // ✅ Initialiser le SSE + charger les notifs existantes
  init(keycloakId: string): void {
    if (this.currentKeycloakId === keycloakId && this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }
    this.currentKeycloakId = keycloakId;
    this.loadAll(keycloakId);
    this.connectSSE(keycloakId);
  }



  private connectSSE(keycloakId: string): void {
    // 1. Nettoyage du timer de reconnexion
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 2. Fermeture de l'ancienne connexion
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // 3. Création de la nouvelle instance
    this.eventSource = new EventSource(`${SSE_BASE}/${keycloakId}`);

    // 4. ✅ AJOUT DU LISTENER (Utilisation du ? pour éviter l'erreur "possibly null")
    this.eventSource?.addEventListener('connected', () => {
      this.loadUnreadCount(keycloakId);
    });

    // 5. Listener pour les notifications
    this.eventSource.addEventListener('notification', (event: MessageEvent) => {
      try {
        const notif: AppNotification = JSON.parse(event.data);
        const current = this.notificationsSubject.getValue();
        const exists = current.some(n => n.id === notif.id);
        if (!exists) {
          this.notificationsSubject.next([notif, ...current]);
          this.recalculerUnread();
        }
      } catch (e) {
        console.error('Erreur parsing notification SSE:', e);
      }
    });

    // 6. Listener pour le compteur
    this.eventSource.addEventListener('unread-count', (event: MessageEvent) => {
      const count = Number(event.data);
      if (!isNaN(count)) {
        this.unreadCountSubject.next(count);
      }
    });

    // 7. Gestion des erreurs
    this.eventSource.onerror = () => {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      if (this.currentKeycloakId) {
        this.reconnectTimer = setTimeout(() => {
          if (this.currentKeycloakId) {
            this.connectSSE(this.currentKeycloakId);
          }
        }, 5000);
      }
    };
  }






  private loadAll(keycloakId: string): void {
    this.http.get<AppNotification[]>(`${API_BASE}/${keycloakId}`).subscribe({
      next: notifs => {
        this.notificationsSubject.next(notifs);
        this.recalculerUnread();
      },
      error: () => {}
    });
  }

  private recalculerUnread(): void {
    const count = this.notificationsSubject.getValue().filter(n => !n.lu).length;
    this.unreadCountSubject.next(count);
  }

  // ── Actions ──

  marquerLu(id: number): void {
    this.http.patch<AppNotification>(`${API_BASE}/${id}/lu`, {}).subscribe({
      next: () => {
        const list = this.notificationsSubject.getValue().map(n =>
          n.id === id ? { ...n, lu: true } : n
        );
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
      next: () => {
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
      },
      error: () => {}
    });
  }

  // ✅ Déconnecter proprement (appelé dans ngOnDestroy du layout)
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.currentKeycloakId = null;
  }

  private loadUnreadCount(keycloakId: string): void {
    this.http.get<number>(`${API_BASE}/${keycloakId}/unread-count`).subscribe({
      next: count => this.unreadCountSubject.next(count),
      error: () => {}
    });
  }
}