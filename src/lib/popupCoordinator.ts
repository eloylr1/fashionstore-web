/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Popup Coordinator
 * Coordina la aparición de popups para que no se solapen.
 * Solo uno puede estar visible a la vez. Cuando uno se cierra,
 * el siguiente espera un tiempo antes de mostrarse.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const DELAY_BETWEEN_POPUPS = 15_000; // 15 segundos entre popups

// Estado global en window para coordinar entre React islands
declare global {
  interface Window {
    __popupQueue: {
      active: string | null;
      lastClosedAt: number;
    };
  }
}

function ensureState() {
  if (typeof window === 'undefined') return;
  if (!window.__popupQueue) {
    window.__popupQueue = {
      active: null,
      lastClosedAt: 0,
    };
  }
}

/**
 * Intenta reservar el slot para mostrar un popup.
 * Devuelve true si se puede mostrar ahora, false si hay que esperar.
 */
export function requestPopupSlot(popupId: string): boolean {
  ensureState();
  if (typeof window === 'undefined') return false;

  // Si ya hay un popup activo, no mostrar
  if (window.__popupQueue.active && window.__popupQueue.active !== popupId) {
    return false;
  }

  // Si se cerró uno hace poco, esperar
  const timeSinceLastClose = Date.now() - window.__popupQueue.lastClosedAt;
  if (window.__popupQueue.lastClosedAt > 0 && timeSinceLastClose < DELAY_BETWEEN_POPUPS) {
    return false;
  }

  // Reservar el slot
  window.__popupQueue.active = popupId;
  return true;
}

/**
 * Libera el slot cuando un popup se cierra.
 * Dispara un evento para que otros popups en cola puedan intentar mostrarse.
 */
export function releasePopupSlot(popupId: string) {
  ensureState();
  if (typeof window === 'undefined') return;

  if (window.__popupQueue.active === popupId) {
    window.__popupQueue.active = null;
    window.__popupQueue.lastClosedAt = Date.now();
    
    // Notificar a otros popups que pueden intentar mostrarse
    window.dispatchEvent(new CustomEvent('popup-slot-released'));
  }
}

/**
 * Verifica si hay un popup activo actualmente.
 */
export function isPopupActive(): boolean {
  ensureState();
  if (typeof window === 'undefined') return false;
  return window.__popupQueue.active !== null;
}

/**
 * Hook helper: escucha el evento de liberación de slot.
 * Llama al callback cuando se libera un slot (con delay incorporado).
 */
export function onSlotAvailable(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    // Esperar el delay entre popups antes de notificar
    setTimeout(callback, DELAY_BETWEEN_POPUPS);
  };

  window.addEventListener('popup-slot-released', handler);
  return () => window.removeEventListener('popup-slot-released', handler);
}
