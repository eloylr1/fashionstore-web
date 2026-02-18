/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Welcome Popup Component
 * Popup para nuevos visitantes con código WELCOME10
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { requestPopupSlot, releasePopupSlot, onSlotAvailable } from '../../lib/popupCoordinator';

const POPUP_ID = 'welcome';

interface WelcomePopupProps {
  isLoggedIn?: boolean;
}

export default function WelcomePopup({ isLoggedIn = false }: WelcomePopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const DISCOUNT_CODE = 'WELCOME10';
  const DISCOUNT_PERCENTAGE = '10%';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Función para intentar mostrar el popup
  const tryShow = () => {
    if (isLoggedIn) return;
    const hasSeenPopup = localStorage.getItem('welcome-popup-seen');
    if (hasSeenPopup) return;
    
    if (requestPopupSlot(POPUP_ID)) {
      setIsVisible(true);
    }
  };

  useEffect(() => {
    if (!isMounted) return;
    if (isLoggedIn) return;

    const hasSeenPopup = localStorage.getItem('welcome-popup-seen');
    if (hasSeenPopup) return;

    // Intentar mostrar después de 5 segundos
    const timer = setTimeout(() => tryShow(), 5000);

    // Si no se pudo, escuchar cuando se libere un slot
    const unsub = onSlotAvailable(() => tryShow());

    return () => { clearTimeout(timer); unsub(); };
  }, [isLoggedIn, isMounted]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('welcome-popup-seen', 'true');
    releasePopupSlot(POPUP_ID);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(DISCOUNT_CODE);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      // Fallback para navegadores que no soportan clipboard
      const textArea = document.createElement('textarea');
      textArea.value = DISCOUNT_CODE;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleShopNow = () => {
    localStorage.setItem('welcome-popup-seen', 'true');
    localStorage.setItem('pending-discount-code', DISCOUNT_CODE);
    releasePopupSlot(POPUP_ID);
    window.location.href = '/tienda';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white max-w-md w-full shadow-2xl overflow-hidden relative animate-slideUp">
        {/* Botón cerrar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-600 transition-colors z-10"
          aria-label="Cerrar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header con gradiente */}
        <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-white p-8 text-center relative overflow-hidden">
          {/* Patrón decorativo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-matte rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gold-matte rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>

          <div className="relative z-10">
            <span className="inline-block bg-gold-matte/20 text-gold-matte text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full mb-4">
              ¡Oferta de Bienvenida!
            </span>
            <h2 className="font-serif text-3xl font-bold mb-2">
              {DISCOUNT_PERCENTAGE} de Descuento
            </h2>
            <p className="text-white/80 text-sm">
              en tu primera compra
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 text-center">
          <p className="text-charcoal-600 mb-6">
            Usa este código exclusivo en tu primera compra y disfruta de un
            <span className="font-semibold text-navy-900"> {DISCOUNT_PERCENTAGE} de descuento</span>.
          </p>

          {/* Código de descuento */}
          <div className="bg-charcoal-50 border-2 border-dashed border-charcoal-200 rounded-lg p-4 mb-6">
            <p className="text-xs text-charcoal-500 uppercase tracking-wider mb-2">Tu código:</p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-2xl font-bold text-navy-900 tracking-wider">
                {DISCOUNT_CODE}
              </span>
              <button
                onClick={handleCopyCode}
                className={`p-2 rounded-lg transition-all ${
                  isCopied 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-charcoal-100 text-charcoal-600 hover:bg-charcoal-200'
                }`}
                aria-label="Copiar código"
              >
                {isCopied ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            {isCopied && (
              <p className="text-green-600 text-sm mt-2 animate-fadeIn">¡Copiado!</p>
            )}
          </div>

          {/* Botones */}
          <div className="space-y-3">
            <button
              onClick={handleShopNow}
              className="w-full py-3 px-4 bg-gradient-to-r from-gold-matte to-yellow-600 text-navy-900 font-semibold rounded-lg hover:shadow-lg hover:shadow-gold-matte/25 transition-all"
            >
              Comprar Ahora
            </button>
            <button
              onClick={handleClose}
              className="w-full py-2 text-charcoal-500 hover:text-navy-900 text-sm transition-colors"
            >
              Más tarde
            </button>
          </div>

          {/* Nota */}
          <p className="text-xs text-charcoal-400 mt-4">
            Válido solo para primera compra. No acumulable con otras ofertas.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
