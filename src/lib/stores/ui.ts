/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - UI Store (Nano Stores)
 * Estado global de la interfaz de usuario
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { atom } from 'nanostores';

// Estado del menú móvil
export const isMobileMenuOpen = atom<boolean>(false);

// Estado de carga global
export const isLoading = atom<boolean>(false);

// Notificaciones toast
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const toasts = atom<Toast[]>([]);

// Actions
export function toggleMobileMenu(): void {
  isMobileMenuOpen.set(!isMobileMenuOpen.get());
}

export function closeMobileMenu(): void {
  isMobileMenuOpen.set(false);
}

export function setLoading(loading: boolean): void {
  isLoading.set(loading);
}

export function addToast(type: Toast['type'], message: string): void {
  const id = crypto.randomUUID();
  const currentToasts = toasts.get();
  
  toasts.set([...currentToasts, { id, type, message }]);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    removeToast(id);
  }, 4000);
}

export function removeToast(id: string): void {
  toasts.set(toasts.get().filter((toast) => toast.id !== id));
}
