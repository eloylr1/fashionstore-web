/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Newsletter Success Popup Component
 * Popup para mostrar código NEWSLETTER15 después del registro
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { requestPopupSlot, releasePopupSlot } from '../../lib/popupCoordinator';

const POPUP_ID = 'newsletter-success';

interface NewsletterSuccessPopupProps {
  show?: boolean;
  onClose?: () => void;
}

export default function NewsletterSuccessPopup({ show = false, onClose }: NewsletterSuccessPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const DISCOUNT_CODE = 'NEWSLETTER15';
  const DISCOUNT_PERCENTAGE = '15%';

  useEffect(() => {
    // Verificar si debe mostrarse desde localStorage (después del registro)
    const showNewsletter = localStorage.getItem('show-newsletter-code');
    if (showNewsletter === 'true') {
      // Este popup tiene máxima prioridad (post-registro)
      // Intentar inmediatamente ya que es crítico
      if (requestPopupSlot(POPUP_ID)) {
        setIsVisible(true);
        localStorage.removeItem('show-newsletter-code');
      } else {
        // Reintentar después de un breve delay
        setTimeout(() => {
          if (requestPopupSlot(POPUP_ID)) {
            setIsVisible(true);
          }
          localStorage.removeItem('show-newsletter-code');
        }, 2000);
      }
    }
  }, []);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
    }
  }, [show]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('newsletter-code-seen', 'true');
    releasePopupSlot(POPUP_ID);
    if (onClose) onClose();
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(DISCOUNT_CODE);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
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
    localStorage.setItem('newsletter-code-seen', 'true');
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

        {/* Header con gradiente verde */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white p-8 text-center relative overflow-hidden">
          {/* Patrón decorativo */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>

          {/* Icono de check */}
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-bold mb-2">
              ¡Bienvenido/a a FashionMarket!
            </h2>
            <p className="text-white/90 text-sm">
              Tu cuenta ha sido creada con éxito
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 text-center">
          <div className="bg-gradient-to-r from-gold-matte/10 to-yellow-100/50 border border-gold-matte/20 rounded-lg p-4 mb-6">
            <span className="inline-block bg-gold-matte text-navy-900 text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-3">
              🎁 Regalo de Bienvenida
            </span>
            <p className="text-navy-900 font-medium">
              Disfruta de un <span className="font-bold text-lg">{DISCOUNT_PERCENTAGE} de descuento</span>
              <br />en tu primera compra
            </p>
          </div>

          {/* Código de descuento */}
          <div className="bg-charcoal-50 border-2 border-dashed border-emerald-300 rounded-lg p-4 mb-6">
            <p className="text-xs text-charcoal-500 uppercase tracking-wider mb-2">Tu código exclusivo:</p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-2xl font-bold text-emerald-600 tracking-wider">
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
              <p className="text-green-600 text-sm mt-2 animate-fadeIn">¡Código copiado!</p>
            )}
          </div>

          {/* Botones */}
          <div className="space-y-3">
            <button
              onClick={handleShopNow}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              Ir a Comprar
            </button>
            <button
              onClick={handleClose}
              className="w-full py-2 text-charcoal-500 hover:text-navy-900 text-sm transition-colors"
            >
              Explorar después
            </button>
          </div>

          {/* Nota */}
          <p className="text-xs text-charcoal-400 mt-4">
            Código de un solo uso. Válido para tu primera compra.
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
