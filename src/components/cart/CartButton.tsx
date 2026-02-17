/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - CartButton Component (Isla React)
 * Botón del carrito en el header con contador
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useStore } from '@nanostores/react';
import { cartCount, openCart } from '../../stores/cart';

export default function CartButton() {
  const count = useStore(cartCount);

  return (
    <button
      type="button"
      onClick={openCart}
      className="relative p-2 hover:opacity-80 transition-opacity"
      aria-label={`Carrito (${count} productos)`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="1.5" 
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" 
        />
      </svg>
      
      {/* Badge con contador */}
      {count > 0 && (
        <span className="cart-badge">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
