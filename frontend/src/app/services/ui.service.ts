// src/app/services/ui.service.ts
import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ModalConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

@Injectable({ providedIn: 'root' })
export class UiService {
  toasts = signal<Toast[]>([]);
  modal  = signal<ModalConfig | null>(null);
  private nextId = 0;

  toast(type: ToastType, message: string, duration = 4000): void {
    const id = ++this.nextId;
    this.toasts.update(t => [...t, { id, type, message, duration }]);
    if (duration > 0) {
      setTimeout(() => this.removeToast(id), duration);
    }
  }

  success(msg: string)  { this.toast('success', msg); }
  error(msg: string)    { this.toast('error',   msg, 6000); }
  warning(msg: string)  { this.toast('warning', msg, 5000); }
  info(msg: string)     { this.toast('info',    msg); }

  removeToast(id: number): void {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  confirm(config: ModalConfig): void {
    this.modal.set(config);
  }

  closeModal(): void {
    this.modal.set(null);
  }
}