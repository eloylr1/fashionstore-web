/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - AddToCartButton Component (Isla React)
 * Botón interactivo para añadir productos al carrito
 * Con soporte de stock por talla y notificaciones de disponibilidad
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { addToCart, formatPrice } from '../../stores/cart';
import SizeRecommenderModal from '../product/SizeRecommenderModal';
import type { Product } from '../../lib/supabase/database.types';

interface AddToCartButtonProps {
  product: Product;
}

interface StockBySize {
  [size: string]: number;
}

interface StockByVariant {
  [key: string]: number; // "size_color" -> stock
}

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockBySize, setStockBySize] = useState<StockBySize>({});
  const [stockByVariant, setStockByVariant] = useState<StockByVariant>({});
  const [hasVariantStock, setHasVariantStock] = useState(false);
  const [loadingStock, setLoadingStock] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const hasColors = product.colors && product.colors.length > 0;

  // Verificar si el usuario está logueado
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          if (data.isLoggedIn && data.user) {
            setIsLoggedIn(true);
            setUserEmail(data.user.email || '');
            setNotifyEmail(data.user.email || '');
          }
        }
      } catch (err) {
        // No logueado
        setIsLoggedIn(false);
      }
    };
    checkAuth();
  }, []);

  // Cargar stock por talla/variante al montar el componente
  useEffect(() => {
    const fetchStock = async () => {
      try {
        const response = await fetch(`/api/products/${product.id}/stock`);
        if (response.ok) {
          const data = await response.json();
          setStockBySize(data.stockBySize || {});
          setStockByVariant(data.stockByVariant || {});
          setHasVariantStock(data.hasColors || false);
        } else {
          // Fallback: usar stock global distribuido entre tallas
          const fallbackStock: StockBySize = {};
          product.sizes.forEach((size) => {
            fallbackStock[size] = Math.floor(product.stock / product.sizes.length);
          });
          setStockBySize(fallbackStock);
        }
      } catch (err) {
        console.error('Error cargando stock:', err);
        // Fallback
        const fallbackStock: StockBySize = {};
        product.sizes.forEach((size) => {
          fallbackStock[size] = Math.floor(product.stock / product.sizes.length);
        });
        setStockBySize(fallbackStock);
      } finally {
        setLoadingStock(false);
      }
    };

    fetchStock();
  }, [product.id, product.stock, product.sizes]);

  // Función para obtener stock de una variante específica
  const getVariantStock = (size: string, color?: string): number => {
    if (hasVariantStock && hasColors && color) {
      // Stock por variante completa (talla + color)
      const key = `${size}_${color}`;
      return stockByVariant[key] ?? 0;
    }
    // Fallback a stock por talla
    return stockBySize[size] ?? 0;
  };

  // Stock de la variante seleccionada
  const selectedVariantStock = selectedSize 
    ? getVariantStock(selectedSize, hasColors ? selectedColor : undefined)
    : product.stock;
  
  const isVariantOutOfStock = selectedSize 
    ? ((hasColors && !selectedColor) ? false : selectedVariantStock < 1)
    : false;
  const isProductOutOfStock = product.stock < 1;

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

    if (isVariantOutOfStock) {
      // Si está logueado, el formulario se muestra automáticamente
      // Si no está logueado, mostrar error
      if (!isLoggedIn) {
        setError('Producto sin stock. Inicia sesión para recibir notificación cuando vuelva.');
      }
      return;
    }

    setError(null);
    setIsAdding(true);

    // Determinar el índice del color seleccionado
    const colorIdx = hasColors && selectedColor 
      ? product.colors.indexOf(selectedColor) 
      : undefined;

    // Simular pequeño delay para feedback visual
    setTimeout(() => {
      addToCart(product, selectedSize, quantity, selectedColor || undefined, colorIdx !== undefined && colorIdx >= 0 ? colorIdx : undefined, selectedVariantStock);
      setIsAdding(false);
      // Reset después de añadir
      setQuantity(1);
    }, 300);
  };

  const handleNotifySubmit = async () => {
    const emailToUse = userEmail || notifyEmail;
    if (!emailToUse || !selectedSize) return;

    setNotifyLoading(true);
    try {
      const response = await fetch(`/api/products/${product.id}/notify-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailToUse, 
          size: selectedSize,
          color: hasColors ? selectedColor : null 
        }),
      });

      if (response.ok) {
        setNotifySuccess(true);
        setTimeout(() => {
          setNotifySuccess(false);
        }, 5000);
      } else {
        setError('No se pudo registrar la notificación');
      }
    } catch (err) {
      setError('Error al registrar notificación');
    } finally {
      setNotifyLoading(false);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    if (quantity < selectedVariantStock) {
      setQuantity(quantity + 1);
    }
  };

  // Handler para seleccionar talla desde el recomendador
  const handleSizeRecommendation = (size: string) => {
    setSelectedSize(size);
    setError(null);
    setQuantity(1);
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

  // Función para obtener estado visual de cada talla
  const getSizeStatus = (size: string) => {
    if (loadingStock) return { available: true, stock: 0 };
    
    // Si hay colores y uno está seleccionado, verificar stock de esa variante
    if (hasVariantStock && hasColors && selectedColor) {
      const variantStock = getVariantStock(size, selectedColor);
      return { available: variantStock > 0, stock: variantStock };
    }
    
    // Fallback a stock por talla
    const stock = stockBySize[size] ?? 0;
    return { available: stock > 0, stock };
  };

  // Función para obtener estado visual de cada color
  const getColorStatus = (color: string) => {
    if (loadingStock) return { available: true, stock: 0 };
    
    // Si hay una talla seleccionada, verificar stock de esa variante
    if (hasVariantStock && selectedSize) {
      const variantStock = getVariantStock(selectedSize, color);
      return { available: variantStock > 0, stock: variantStock };
    }
    
    // Sin talla seleccionada, sumar el stock de todas las tallas para ese color
    let totalColorStock = 0;
    product.sizes.forEach(size => {
      totalColorStock += getVariantStock(size, color);
    });
    return { available: totalColorStock > 0, stock: totalColorStock };
  };

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
            {product.colors.map((color, index) => {
              const colorStatus = getColorStatus(color);
              const isColorOutOfStock = !loadingStock && !colorStatus.available;
              
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color, index)}
                  className={`
                    relative px-4 py-2.5 text-sm font-medium border transition-all duration-200
                    ${selectedColor === color
                      ? isColorOutOfStock
                        ? 'border-charcoal-400 bg-charcoal-100 text-charcoal-600'
                        : 'border-navy-900 bg-navy-900 text-white'
                      : isColorOutOfStock
                        ? 'border-charcoal-200 bg-charcoal-50 text-charcoal-400'
                        : 'border-charcoal-200 text-charcoal-700 hover:border-charcoal-400'
                    }
                  `}
                >
                  {color}
                  {isColorOutOfStock && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" title="Sin stock"></span>
                    </span>
                  )}
                </button>
              );
            })}
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
          {product.sizes.map((size) => {
            const status = getSizeStatus(size);
            const isSelected = selectedSize === size;
            const isDisabled = !loadingStock && !status.available;
            
            return (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setSelectedSize(size);
                  setError(null);
                  setQuantity(1);
                }}
                disabled={false} // Permitir seleccionar para mostrar opción de notificación
                className={`
                  relative py-3 text-sm font-medium border transition-all duration-200
                  ${isSelected
                    ? isDisabled
                      ? 'border-charcoal-400 bg-charcoal-100 text-charcoal-600'
                      : 'border-navy-900 bg-navy-900 text-white'
                    : isDisabled
                      ? 'border-charcoal-200 bg-charcoal-50 text-charcoal-400 cursor-pointer'
                      : 'border-charcoal-200 text-charcoal-700 hover:border-charcoal-400'
                  }
                `}
              >
                {size}
                {isDisabled && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" title="Sin stock"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Indicador de stock por variante */}
        {selectedSize && (!hasColors || selectedColor) && !loadingStock && (
          <p className={`mt-2 text-sm ${isVariantOutOfStock ? 'text-red-600' : selectedVariantStock <= 3 ? 'text-amber-600' : 'text-charcoal-500'}`}>
            {isVariantOutOfStock 
              ? hasColors && selectedColor
                ? `${selectedSize} / ${selectedColor} sin stock` 
                : `Talla ${selectedSize} sin stock`
              : selectedVariantStock <= 3 
                ? `¡Solo quedan ${selectedVariantStock} unidades!`
                : `${selectedVariantStock} unidades disponibles`
            }
          </p>
        )}
        
        {error && (
          <p className="mt-2 text-sm text-error">{error}</p>
        )}
      </div>

      {/* Selector de Cantidad */}
      {!isVariantOutOfStock && (
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
                disabled={quantity >= selectedVariantStock}
                className="w-12 h-12 flex items-center justify-center text-charcoal-600 hover:bg-charcoal-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Aumentar cantidad"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón Añadir al Carrito */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isProductOutOfStock || isAdding || (selectedSize && (!hasColors || selectedColor) && isVariantOutOfStock)}
        className={`
          w-full py-4 text-base font-medium tracking-wide transition-all duration-300
          ${isProductOutOfStock || (selectedSize && (!hasColors || selectedColor) && isVariantOutOfStock)
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
        ) : isProductOutOfStock ? (
          'Producto agotado'
        ) : selectedSize && (!hasColors || selectedColor) && isVariantOutOfStock ? (
          hasColors && selectedColor ? 'Variante agotada' : 'Talla agotada'
        ) : (
          'Añadir al carrito'
        )}
      </button>

      {/* Formulario de notificación de stock - aparece después del botón cuando está agotado */}
      {selectedSize && (!hasColors || selectedColor) && selectedVariantStock < 1 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mt-4">
          {!isLoggedIn ? (
            <div className="text-center">
              <p className="text-sm text-amber-800 mb-3">
                ¿Quieres que te avisemos cuando vuelva a estar disponible?
              </p>
              <a 
                href="/login" 
                className="inline-block px-4 py-2 text-sm font-medium bg-navy-900 text-white rounded hover:bg-navy-800 transition-colors"
              >
                Inicia sesión para recibir aviso
              </a>
            </div>
          ) : notifySuccess ? (
            <div className="flex items-center justify-center gap-2 text-green-700 py-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">¡Te avisaremos cuando vuelva a estar disponible!</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-3 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={true}
                  readOnly
                  className="w-5 h-5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-amber-900">
                  Avisarme a <strong>{userEmail}</strong>
                </span>
              </label>
              <button
                type="button"
                onClick={handleNotifySubmit}
                disabled={notifyLoading}
                className="px-5 py-2.5 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {notifyLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </span>
                ) : 'Avísame'}
              </button>
            </div>
          )}
        </div>
      )}

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
