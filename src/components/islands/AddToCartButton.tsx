/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - AddToCartButton Component (Isla React)
 * Botón interactivo para añadir productos al carrito
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from 'react';
import { addToCart, formatPrice } from '../../stores/cart';
import SizeRecommenderModal from '../product/SizeRecommenderModal';
import type { Product } from '../../lib/supabase/database.types';

interface AddToCartButtonProps {
  product: Product;
}

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasColors = product.colors && product.colors.length > 0;

  const handleAddToCart = () => {
    // Validaciones
    if (!selectedSize) {
      setError('Por favor, selecciona una talla');
      return;
    }

    if (hasColors && !selectedColor) {
      setError('Por favor, selecciona un color');
      return;
    }

    if (product.stock < 1) {
      setError('Producto sin stock');
      return;
    }

    setError(null);
    setIsAdding(true);

    // Simular pequeño delay para feedback visual
    setTimeout(() => {
      addToCart(product, selectedSize, quantity, selectedColor || undefined);
      setIsAdding(false);
      // Reset después de añadir
      setQuantity(1);
    }, 300);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  // Handler para seleccionar talla desde el recomendador
  const handleSizeRecommendation = (size: string) => {
    setSelectedSize(size);
    setError(null);
  };

  // Handler para seleccionar color y emitir evento para cambiar la imagen
  const handleColorSelect = (color: string, index: number) => {
    setSelectedColor(color);
    setError(null);
    
    // Emitir evento para que ProductGallery cambie la imagen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('colorChanged', { 
        detail: { colorIndex: index } 
      }));
    }
  };

  const isOutOfStock = product.stock < 1;

  return (
    <div className="space-y-6">
      {/* Precio */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-serif font-medium text-navy-900">
          {formatPrice(product.price)}
        </span>
        <span className="text-sm text-charcoal-500">IVA incluido</span>
      </div>

      {/* Selector de Color */}
      {hasColors && (
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-3">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((color, index) => (
              <button
                key={color}
                type="button"
                onClick={() => handleColorSelect(color, index)}
                className={`
                  px-4 py-2.5 text-sm font-medium border transition-all duration-200
                  ${selectedColor === color
                    ? 'border-navy-900 bg-navy-900 text-white'
                    : 'border-charcoal-200 text-charcoal-700 hover:border-charcoal-400'
                  }
                `}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selector de Talla */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-charcoal-700">
            Talla
          </label>
          <div className="flex items-center gap-3">
            {/* Recomendador de talla */}
            <SizeRecommenderModal 
              availableSizes={product.sizes} 
              onSelectSize={handleSizeRecommendation}
            />
            <span className="text-charcoal-300">|</span>
            <button 
              type="button"
              className="text-xs text-charcoal-500 hover:text-navy-900 underline transition-colors"
            >
              Guía de tallas
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          {product.sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                setSelectedSize(size);
                setError(null);
              }}
              className={`
                py-3 text-sm font-medium border transition-all duration-200
                ${selectedSize === size
                  ? 'border-navy-900 bg-navy-900 text-white'
                  : 'border-charcoal-200 text-charcoal-700 hover:border-charcoal-400'
                }
              `}
            >
              {size}
            </button>
          ))}
        </div>
        
        {error && (
          <p className="mt-2 text-sm text-error">{error}</p>
        )}
      </div>

      {/* Selector de Cantidad */}
      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-3">
          Cantidad
        </label>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-charcoal-200">
            <button
              type="button"
              onClick={decreaseQuantity}
              disabled={quantity <= 1}
              className="w-12 h-12 flex items-center justify-center text-charcoal-600 hover:bg-charcoal-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Disminuir cantidad"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
              </svg>
            </button>
            
            <span className="w-12 text-center font-medium text-charcoal-800">
              {quantity}
            </span>
            
            <button
              type="button"
              onClick={increaseQuantity}
              disabled={quantity >= product.stock}
              className="w-12 h-12 flex items-center justify-center text-charcoal-600 hover:bg-charcoal-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Aumentar cantidad"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          {/* Stock indicator */}
          <span className={`text-sm ${product.stock <= 5 ? 'text-warning' : 'text-charcoal-500'}`}>
            {isOutOfStock 
              ? 'Sin stock'
              : product.stock <= 5 
                ? `¡Solo quedan ${product.stock}!`
                : `${product.stock} disponibles`
            }
          </span>
        </div>
      </div>

      {/* Botón Añadir al Carrito */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isOutOfStock || isAdding}
        className={`
          w-full py-4 text-base font-medium tracking-wide transition-all duration-300
          ${isOutOfStock
            ? 'bg-charcoal-200 text-charcoal-500 cursor-not-allowed'
            : isAdding
              ? 'bg-navy-800 text-white cursor-wait'
              : 'bg-navy-900 text-white hover:bg-navy-800 active:scale-[0.99]'
          }
        `}
      >
        {isAdding ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Añadiendo...
          </span>
        ) : isOutOfStock ? (
          'Agotado'
        ) : (
          'Añadir al carrito'
        )}
      </button>

      {/* Información adicional */}
      <div className="pt-4 border-t border-charcoal-100 space-y-3">
        <div className="flex items-center gap-3 text-sm text-charcoal-600">
          <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
          </svg>
          Envío gratis en pedidos +100€
        </div>
        <div className="flex items-center gap-3 text-sm text-charcoal-600">
          <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Devolución gratuita en 30 días
        </div>
      </div>
    </div>
  );
}
