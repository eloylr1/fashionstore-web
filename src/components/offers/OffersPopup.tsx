/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Offers Popup Component
 * Modal para mostrar ofertas especiales y productos en descuento
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { requestPopupSlot, releasePopupSlot, onSlotAvailable } from '../../lib/popupCoordinator';

const POPUP_ID = 'offers';
const STORAGE_KEY = 'offers_popup_state';
const DISMISS_HOURS = 24; // Vuelve a mostrar cada 24 horas

interface OfferProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
}

interface PopupState {
  dismissed: boolean;
  dismissedAt?: number;
}

// Formatear precio de céntimos a euros
const formatPrice = (cents: number): string => {
  return (cents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
};

export default function OffersPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [offers, setOffers] = useState<OfferProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOffer, setActiveOffer] = useState(0);
  const [offersLoaded, setOffersLoaded] = useState(false);

  // Función para intentar mostrar si hay ofertas cargadas
  const tryShow = () => {
    if (!offersLoaded || isOpen) return;
    if (requestPopupSlot(POPUP_ID)) {
      setIsOpen(true);
    }
  };

  // Escuchar liberación de slots
  useEffect(() => {
    if (!offersLoaded || isOpen) return;
    const unsub = onSlotAvailable(() => tryShow());
    return () => unsub();
  }, [offersLoaded, isOpen]);

  useEffect(() => {
    // Verificar si debemos mostrar el popup
    const checkPopupState = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const state: PopupState = JSON.parse(stored);
          
          // Si lo cerró, verificar si han pasado las horas
          if (state.dismissed && state.dismissedAt) {
            const hoursPassed = (Date.now() - state.dismissedAt) / (1000 * 60 * 60);
            if (hoursPassed < DISMISS_HOURS) return false;
          }
        }
        return true;
      } catch {
        return true;
      }
    };

    // Cargar ofertas si debemos mostrar el popup
    const loadOffers = async () => {
      if (!checkPopupState()) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/products/offers');
        if (!response.ok) throw new Error('Error fetching offers');
        
        const data = await response.json();
        
        if (data.offers && data.offers.length > 0) {
          setOffers(data.offers);
          setOffersLoaded(true);
          // Intentar mostrar después de 25 segundos (dar prioridad a WelcomePopup)
          setTimeout(() => {
            if (requestPopupSlot(POPUP_ID)) {
              setIsOpen(true);
            }
          }, 25000);
        }
      } catch (error) {
        console.error('Error loading offers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, []);

  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // Bloquear scroll cuando está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Auto-rotar ofertas
  useEffect(() => {
    if (!isOpen || offers.length <= 1) return;
    
    const interval = setInterval(() => {
      setActiveOffer((prev) => (prev + 1) % offers.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [isOpen, offers.length]);

  const handleClose = () => {
    setIsOpen(false);
    releasePopupSlot(POPUP_ID);
    // Guardar que cerró el popup
    const state: PopupState = {
      dismissed: true,
      dismissedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const handleViewOffer = (slug: string) => {
    handleClose();
    window.location.href = `/producto/${slug}`;
  };

  const handleViewAllOffers = () => {
    handleClose();
    window.location.href = '/tienda?ofertas=true';
  };

  if (!isOpen || offers.length === 0) return null;

  const currentOffer = offers[activeOffer];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offers-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10 bg-black/20 rounded-full"
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header con banner de oferta */}
        <div className="relative bg-gradient-to-br from-red-600 via-red-500 to-orange-500 px-6 pt-10 pb-6 text-center">
          {/* Badge de descuento */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-yellow-400 text-navy-900 font-bold text-sm rounded-full shadow-lg animate-pulse">
            ¡OFERTA FLASH!
          </div>
          
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 id="offers-title" className="text-2xl font-serif text-white mb-2 drop-shadow-lg">
            ¡Ofertas Exclusivas!
          </h2>
          <p className="text-white/90 text-sm">
            Hasta <span className="font-bold text-yellow-300">-{Math.max(...offers.map(o => o.discount))}%</span> en productos seleccionados
          </p>
        </div>

        {/* Producto destacado */}
        <div className="p-6">
          <div className="relative bg-cream rounded-xl overflow-hidden mb-4 group cursor-pointer" onClick={() => handleViewOffer(currentOffer.slug)}>
            {/* Badge de descuento */}
            <div className="absolute top-3 left-3 z-10 px-3 py-1 bg-red-600 text-white text-sm font-bold rounded-lg shadow-md">
              -{currentOffer.discount}%
            </div>
            
            {/* Imagen del producto */}
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={currentOffer.image}
                alt={currentOffer.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            
            {/* Info del producto */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <h3 className="text-white font-semibold text-lg mb-1 drop-shadow-md">
                {currentOffer.name}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-white/60 line-through text-sm">
                  {formatPrice(currentOffer.originalPrice)}
                </span>
                <span className="text-yellow-400 font-bold text-xl">
                  {formatPrice(currentOffer.salePrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Indicadores de carrusel */}
          {offers.length > 1 && (
            <div className="flex justify-center gap-2 mb-4">
              {offers.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveOffer(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeOffer ? 'bg-navy-900 w-6' : 'bg-charcoal-300 hover:bg-charcoal-400'
                  }`}
                  aria-label={`Ver oferta ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Botones de acción */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleViewOffer(currentOffer.slug)}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white font-semibold rounded-lg hover:from-red-700 hover:to-orange-600 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              ¡Lo quiero!
            </button>
            
            <button
              type="button"
              onClick={handleViewAllOffers}
              className="w-full py-3 border-2 border-navy-900 text-navy-900 font-medium rounded-lg hover:bg-navy-50 transition-colors flex items-center justify-center gap-2"
            >
              Ver todas las ofertas
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>

          {/* Countdown timer (opcional) */}
          <div className="mt-4 text-center">
            <p className="text-xs text-charcoal-500">
              ⏰ Ofertas válidas por tiempo limitado
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
