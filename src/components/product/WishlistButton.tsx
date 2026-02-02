/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - WishlistButton Component
 * Botón de favoritos con estado reactivo
 * Solo se muestra si el usuario está logueado
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';

interface WishlistButtonProps {
  productId: string;
  className?: string;
}

export default function WishlistButton({ productId, className = '' }: WishlistButtonProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Verificar estado inicial
  useEffect(() => {
    const checkWishlistStatus = async () => {
      try {
        const response = await fetch(`/api/wishlist/check?product_id=${productId}`);
        const data = await response.json();
        
        setIsLoggedIn(data.isLoggedIn);
        setIsFavorite(data.isFavorite);
      } catch (error) {
        console.error('Error checking wishlist:', error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkWishlistStatus();
  }, [productId]);

  // Toggle favorito
  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      // Redirigir al login
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    if (isToggling) return;

    setIsToggling(true);
    
    try {
      const response = await fetch('/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId })
      });

      const data = await response.json();

      if (data.requiresLogin) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        return;
      }

      if (data.success) {
        setIsFavorite(data.isFavorite);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setIsToggling(false);
    }
  };

  // No mostrar nada mientras carga o si no está logueado
  if (isLoading) {
    return (
      <div className={`w-10 h-10 bg-white/90 backdrop-blur-sm flex items-center justify-center ${className}`}>
        <div className="w-5 h-5 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Si no está logueado, no mostrar el botón
  if (!isLoggedIn) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`w-10 h-10 bg-white/90 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:bg-white hover:scale-110 disabled:opacity-50 ${className}`}
      aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
    >
      {isToggling ? (
        <div className="w-5 h-5 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin"></div>
      ) : (
        <svg 
          className={`w-5 h-5 transition-colors duration-300 ${isFavorite ? 'text-red-500 fill-current' : 'text-navy-900'}`} 
          fill={isFavorite ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={isFavorite ? 0 : 1.5} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
      )}
    </button>
  );
}
