import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {

  isDark = false;
  sidebarOpen = false;
  sidebarCollapsed = false;   // ← NOUVEAU

  userName = 'John Carter';

  get userInitials(): string {
    return this.userName
      .split(' ')
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');
  }

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('theme') || 'light';
      this.isDark = saved === 'dark';
      this.applyTheme(this.isDark);
    }
  }

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

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  toggleCollapse(): void {           // ← NOUVEAU
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const fallback = img.parentElement?.querySelector('.logo-icon-fallback') as HTMLElement;
    if (fallback) fallback.style.display = 'flex';
  }
}