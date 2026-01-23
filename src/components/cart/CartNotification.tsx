/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Cart Notification Toast Component
 * Muestra notificaciones del carrito (bienvenida, items restaurados, etc.)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useStore } from '@nanostores/react';
import { cartNotification, hideCartNotification, openCart } from '../../lib/stores/cart';

export default function CartNotification() {
  const notification = useStore(cartNotification);

  if (!notification) return null;

  const icons = {
    welcome: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    restored: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    added: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ),
  };

  const colors = {
    welcome: 'from-gold-matte to-gold-dark',
    restored: 'from-navy-800 to-navy-900',
    added: 'from-green-500 to-green-600',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in-right">
      <div className={`flex items-center gap-4 px-5 py-4 bg-gradient-to-r ${colors[notification.type]} text-white rounded-xl shadow-2xl max-w-sm`}>
        {/* Icono */}
        <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
          {icons[notification.type]}
        </div>
        
        {/* Mensaje */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">
            {notification.message}
          </p>
          {notification.itemCount && notification.itemCount > 0 && (
            <button
              type="button"
              onClick={() => {
                hideCartNotification();
                openCart();
              }}
              className="mt-2 text-xs underline underline-offset-2 opacity-90 hover:opacity-100 transition-opacity"
            >
              Ver carrito →
            </button>
          )}
        </div>
        
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={hideCartNotification}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Cerrar notificación"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
