// src/app/shared/components/toast-modal/toast-modal.component.ts
import { Component, inject } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { UiService } from '../../../services/ui.service';

@Component({
  selector: 'app-toast-modal',
  standalone: true,
  imports: [NgFor, NgIf, NgClass],
  template: `
    <!-- ═══ TOASTS ═══ -->
    <div class="toast-container" aria-live="polite">
      <div *ngFor="let t of ui.toasts()"
           class="toast toast-{{ t.type }}"
           [attr.data-id]="t.id">
        <span class="toast-icon">{{ toastIcon(t.type) }}</span>
        <span class="toast-msg">{{ t.message }}</span>
        <button class="toast-close" (click)="ui.removeToast(t.id)" aria-label="Fermer">×</button>
      </div>
    </div>

    <!-- ═══ MODAL ═══ -->
    <div *ngIf="ui.modal() as m" class="modal-backdrop" (click)="handleBackdropClick($event)">
      <div class="modal-box modal-{{ m.type || 'info' }}" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-icon">{{ modalIcon(m.type) }}</span>
          <h3 class="modal-title">{{ m.title }}</h3>
        </div>
        <p class="modal-message">{{ m.message }}</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel"
                  (click)="cancel(m)">
            {{ m.cancelLabel || 'Annuler' }}
          </button>
          <button class="modal-btn modal-btn-confirm modal-confirm-{{ m.type || 'info' }}"
                  (click)="confirm(m)">
            {{ m.confirmLabel || 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ToastModalComponent {
  readonly ui = inject(UiService);

  toastIcon(type: string): string {
    return { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }[type] ?? '🔔';
  }

  modalIcon(type?: string): string {
    return { danger: '🗑️', warning: '⚠️', info: 'ℹ️' }[type ?? 'info'] ?? 'ℹ️';
  }

  confirm(m: any): void { m.onConfirm(); this.ui.closeModal(); }
  cancel(m: any): void  { m.onCancel?.(); this.ui.closeModal(); }

  handleBackdropClick(e: MouseEvent): void {
    const m = this.ui.modal();
    if (m) { m.onCancel?.(); this.ui.closeModal(); }
  }
}