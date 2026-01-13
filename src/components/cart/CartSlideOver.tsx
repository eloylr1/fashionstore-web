/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - CartSlideOver Component (Isla React)
 * Panel lateral deslizante del carrito de compras
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useStore } from '@nanostores/react';
import { 
  cartItems, 
  isCartOpen, 
  closeCart, 
  removeFromCart, 
  updateQuantity,
  cartSubtotalFormatted,
  formatPrice 
} from '../../stores/cart';

export default function CartSlideOver() {
  const items = useStore(cartItems);
  const isOpen = useStore(isCartOpen);
  const subtotal = useStore(cartSubtotalFormatted);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="slide-over-backdrop"
        onClick={closeCart}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div className="slide-over-panel animate-slide-in-right">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-charcoal-100 flex items-center justify-between">
            <h2 className="font-serif text-xl font-medium text-navy-900">
              Tu carrito
            </h2>
            <button
              type="button"
              onClick={closeCart}
              className="p-2 -mr-2 text-charcoal-500 hover:text-navy-900 transition-colors"
              aria-label="Cerrar carrito"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Items */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <svg className="w-16 h-16 text-charcoal-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-charcoal-600 mb-2">Tu carrito está vacío</p>
                <p className="text-sm text-charcoal-400 mb-6">
                  Explora nuestra colección y encuentra algo que te guste
                </p>
                <button
                  onClick={closeCart}
                  className="btn-secondary"
                >
                  Seguir comprando
                </button>
              </div>
            ) : (
              <ul className="space-y-4">
                {items.map((item) => (
                  <li 
                    key={`${item.productId}-${item.size}`}
                    className="flex gap-4 py-4 border-b border-charcoal-100 last:border-0"
                  >
                    {/* Product Image */}
                    <div className="w-20 h-24 bg-cream flex-shrink-0 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-navy-900 truncate">
                            <a href={`/producto/${item.slug}`} onClick={closeCart}>
                              {item.name}
                            </a>
                          </h3>
                          <p className="text-sm text-charcoal-500 mt-0.5">
                            Talla: {item.size}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-navy-900 ml-4">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                      
                      {/* Quantity controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-charcoal-200">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-charcoal-600 hover:bg-charcoal-50 transition-colors"
                            aria-label="Disminuir cantidad"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                            </svg>
                          </button>
                          
                          <span className="w-8 text-center text-sm font-medium text-charcoal-800">
                            {item.quantity}
                          </span>
                          
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                            disabled={item.quantity >= item.maxStock}
                            className="w-8 h-8 flex items-center justify-center text-charcoal-600 hover:bg-charcoal-50 disabled:opacity-50 transition-colors"
                            aria-label="Aumentar cantidad"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId, item.size)}
                          className="text-sm text-charcoal-500 hover:text-error transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-charcoal-100 px-6 py-5 space-y-4 bg-white">
              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-base text-charcoal-600">Subtotal</span>
                <span className="text-lg font-medium text-navy-900">{subtotal}</span>
              </div>
              
              <p className="text-xs text-charcoal-500">
                Gastos de envío calculados en el checkout
              </p>
              
              {/* Checkout Button */}
              <a 
                href="/checkout"
                className="btn-primary w-full text-center"
                onClick={closeCart}
              >
                Finalizar compra
              </a>
              
              {/* Continue Shopping */}
              <button
                type="button"
                onClick={closeCart}
                className="w-full text-center text-sm text-charcoal-600 hover:text-navy-900 transition-colors"
              >
                Seguir comprando
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
