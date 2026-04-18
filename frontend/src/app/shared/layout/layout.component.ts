import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, inject, signal } from '@angular/core';
import { isPlatformBrowser, NgIf,NgFor, AsyncPipe } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { KeycloakService } from '../../services/keycloak.service';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';
import { Utilisateur } from '../../shared/models/utilisateur.model';
import { AppNotification } from '../../shared/models/notification.model';
import { Subscription } from 'rxjs';
import { ToastModalComponent } from '../components/toast-modal-component/toast-modal-component.component';
import { NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf,NgFor, AsyncPipe,ToastModalComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit, OnDestroy {

  isDark = false;
  sidebarOpen = false;
  sidebarCollapsed = false;
  showUserMenu = false;
  showNotifPanel = false;  // ✅ Panel notifications
  ftMenuOpen = false;

  currentUser = signal<Utilisateur | null>(null);

  private keycloakService  = inject(KeycloakService);
  private userService      = inject(UserService);
  private router           = inject(Router);
  readonly notifService    = inject(NotificationService); // public pour le template
  private sub = new Subscription();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('theme') || 'light';
      this.isDark = saved === 'dark';
      this.applyTheme(this.isDark);

      // Fermer les panels en cliquant ailleurs
      document.addEventListener('click', () => {
        this.showUserMenu = false;
        this.showNotifPanel = false;
      });
    }
    this.loadCurrentUser();
    if (this.isRouteActive('/feuille-temps')) {
          this.ftMenuOpen = true;
       }
       this.router.events.subscribe(evt => {
          if (evt instanceof NavigationEnd) {
            if (evt.url.startsWith('/feuille-temps')) this.ftMenuOpen = true;
          }
        });

  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.notifService.disconnect();
  }

  private loadCurrentUser(): void {
    const keycloakId = this.keycloakService.getKeycloakUserId();
    if (!keycloakId) return;

    this.userService.getUserByKeycloakId(keycloakId).subscribe({
      next: (user) => {
        this.currentUser.set(user);
        // ✅ Initialiser les notifications dès que l'utilisateur est chargé
        this.notifService.init(keycloakId);
      },
      error: (err) => {
        if (err.status === 404) console.info('Profil non trouvé en base.');
        // Initialiser quand même les notifs
        if (keycloakId) this.notifService.init(keycloakId);
      }
    });
  }

  // ── Panel notifications ──
  toggleNotifPanel(event: Event): void {
    event.stopPropagation();
    this.showNotifPanel = !this.showNotifPanel;
    this.showUserMenu = false;
  }

  onNotifClick(notif: AppNotification): void {
    if (!notif.lu) this.notifService.marquerLu(notif.id);
    this.showNotifPanel = false;
    if (notif.lien) this.router.navigate([notif.lien]);
  }

  // ── Icône selon le type ──
  getNotifIcon(type: string): string {
    const icons: Record<string, string> = {
      FEUILLE_SOUMISE: '📋',
      FEUILLE_VALIDEE: '✅',
      FEUILLE_REJETEE: '❌'
    };
    return icons[type] ?? '🔔';
  }

  getNotifColor(type: string): string {
    const colors: Record<string, string> = {
      FEUILLE_SOUMISE: '#3b82f6',
      FEUILLE_VALIDEE: '#10b981',
      FEUILLE_REJETEE: '#ef4444'
    };
    return colors[type] ?? 'var(--accent)';
  }

  formatNotifDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1)  return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)   return `Il y a ${diffH}h`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  // ── Existants ──
  get userName(): string {
    const u = this.currentUser();
    if (u) return (u.prenom + ' ' + u.nom).trim();
    return this.keycloakService.getFullName() || 'Utilisateur';
  }

  get userRole(): string {
    return this.currentUser()?.profilNom || 'Collaborateur';
  }

  get userPhoto(): string | null {
    return this.currentUser()?.photoUrl || null;
  }

  get userInitials(): string {
    return this.userName.split(' ').slice(0, 2)
      .map(n => n[0]?.toUpperCase() ?? '').join('');
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
    this.showNotifPanel = false;
  }

  logout(): void { this.keycloakService.logout(); }

  toggleTheme(): void {
    const next = !this.isDark;
    const root = document.documentElement;
    if (!(document as any).startViewTransition) {
      this.isDark = next; this.applyTheme(next); return;
    }
    root.classList.toggle('going-light', !next);
    (document as any).startViewTransition(() => { this.isDark = next; this.applyTheme(next); });
  }

  private applyTheme(dark: boolean): void {
    const root = document.documentElement;
    dark ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }

  toggleSidebar(): void  { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar(): void   { this.sidebarOpen = false; }
  toggleCollapse(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const fallback = img.parentElement?.querySelector('.logo-icon-fallback') as HTMLElement;
    if (fallback) fallback.style.display = 'flex';
  }



  toggleFTMenu(): void {
    this.ftMenuOpen = !this.ftMenuOpen;
  }
   
  isRouteActive(path: string): boolean {
    return typeof window !== 'undefined' && window.location.pathname.startsWith(path);
  }
}