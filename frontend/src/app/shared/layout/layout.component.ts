import { Component, OnInit, PLATFORM_ID, Inject, inject, signal } from '@angular/core';
import { isPlatformBrowser, NgIf } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { KeycloakService } from '../../services/keycloak.service';
import { UserService } from '../../services/user.service';
import { Utilisateur } from '../../shared/models/utilisateur.model';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {

  isDark = false;
  sidebarOpen = false;
  sidebarCollapsed = false;
  showUserMenu = false;  // ✅ Menu utilisateur

  currentUser = signal<Utilisateur | null>(null);

  private keycloakService = inject(KeycloakService);
  private userService = inject(UserService);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('theme') || 'light';
      this.isDark = saved === 'dark';
      this.applyTheme(this.isDark);
    }
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    const keycloakId = this.keycloakService.getKeycloakUserId();
    if (!keycloakId) return;
    this.userService.getUserByKeycloakId(keycloakId).subscribe({
      next: (user) => this.currentUser.set(user),
      error: () => console.warn('Utilisateur non trouvé en base')
    });
  }

  // ✅ Nom affiché
  get userName(): string {
    const u = this.currentUser();
    if (u) return (u.prenom + ' ' + u.nom).trim();
    return this.keycloakService.getFullName() || 'Utilisateur';
  }

  // ✅ Rôle affiché
  get userRole(): string {
    return this.currentUser()?.profilNom || 'Collaborateur';
  }

  // ✅ Photo URL
  get userPhoto(): string | null {
    return this.currentUser()?.photoUrl || null;
  }

  // ✅ Initiales (2 lettres)
  get userInitials(): string {
    return this.userName
      .split(' ')
      .slice(0, 2)
      .map(n => n[0]?.toUpperCase() ?? '')
      .join('');
  }

  // ✅ Toggle menu utilisateur
  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  // ✅ Logout → redirige vers Keycloak login
  logout(): void {
    this.keycloakService.logout();
  }

  // ── Thème ──
  toggleTheme(): void {
    const next = !this.isDark;
    const root = document.documentElement;
    if (!(document as any).startViewTransition) {
      this.isDark = next;
      this.applyTheme(next);
      return;
    }
    root.classList.toggle('going-light', !next);
    (document as any).startViewTransition(() => {
      this.isDark = next;
      this.applyTheme(next);
    });
  }

  private applyTheme(dark: boolean): void {
    const root = document.documentElement;
    dark ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebar(): void   { this.sidebarOpen = false; }
  toggleCollapse(): void { this.sidebarCollapsed = !this.sidebarCollapsed; }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const fallback = img.parentElement?.querySelector('.logo-icon-fallback') as HTMLElement;
    if (fallback) fallback.style.display = 'flex';
  }
}