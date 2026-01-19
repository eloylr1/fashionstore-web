/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Newsletter Popup Component
 * Modal para suscripción al newsletter con código promocional
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'newsletter_popup_state';
const DISMISS_DAYS = 7;

interface PopupState {
  dismissed: boolean;
  subscribed: boolean;
  dismissedAt?: number;
}

export default function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Verificar si debemos mostrar el popup
    const checkPopupState = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const state: PopupState = JSON.parse(stored);
          
          // Si ya está suscrito, no mostrar nunca
          if (state.subscribed) return;
          
          // Si lo cerró, verificar si han pasado los días
          if (state.dismissed && state.dismissedAt) {
            const daysPassed = (Date.now() - state.dismissedAt) / (1000 * 60 * 60 * 24);
            if (daysPassed < DISMISS_DAYS) return;
          }
        }
        
        // Mostrar después de un pequeño delay
        const timer = setTimeout(() => setIsOpen(true), 2000);
        return () => clearTimeout(timer);
      } catch {
        // Si hay error con localStorage, mostrar igualmente
        const timer = setTimeout(() => setIsOpen(true), 2000);
        return () => clearTimeout(timer);
      }
    };

    checkPopupState();
  }, []);

  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !success) {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, success]);

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

  const handleClose = () => {
    setIsOpen(false);
    // Guardar que cerró el popup
    const state: PopupState = {
      dismissed: true,
      subscribed: false,
      dismissedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const handleSuccessClose = () => {
    setIsOpen(false);
    // Marcar como suscrito para no volver a mostrar
    const state: PopupState = {
      dismissed: false,
      subscribed: true,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) {
      setError('Por favor, introduce tu email');
      return;
    }

    if (!validateEmail(email)) {
      setError('Email no válido');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al suscribirse');
      }

      setPromoCode(data.promo_code);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error inesperado. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para navegadores sin clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = promoCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsletter-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={success ? handleSuccessClose : handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in">
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={success ? handleSuccessClose : handleClose}
          className="absolute top-4 right-4 p-2 text-charcoal-400 hover:text-charcoal-600 transition-colors z-10"
          aria-label="Cerrar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!success ? (
          <>
            {/* Header con imagen/patrón */}
            <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 px-8 pt-12 pb-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold-matte/20 mb-4">
                <svg className="w-8 h-8 text-gold-matte" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h2 id="newsletter-title" className="text-2xl font-serif text-white mb-2">
                ¡Bienvenido a FashionMarket!
              </h2>
              <p className="text-white/80 text-sm">
                Suscríbete y consigue un código de descuento exclusivo
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-8">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="newsletter-email" className="sr-only">Email</label>
                <input
                  type="email"
                  id="newsletter-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 border border-charcoal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-matte focus:border-transparent text-navy-900 placeholder-charcoal-400"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gold-matte text-white font-medium rounded-lg hover:bg-gold-matte/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    ¡Quiero mi código!
                  </>
                )}
              </button>

              <p className="mt-4 text-xs text-center text-charcoal-500">
                Al suscribirte, aceptas recibir emails promocionales. 
                Puedes darte de baja en cualquier momento.
              </p>
            </form>
          </>
        ) : (
          /* Estado de éxito */
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-2xl font-serif text-navy-900 mb-2">
              ¡Gracias por suscribirte!
            </h3>
            <p className="text-charcoal-600 mb-6">
              Aquí tienes tu código de descuento exclusivo:
            </p>

            {/* Código promocional */}
            <div className="bg-gradient-to-r from-navy-900 to-navy-800 rounded-xl p-6 mb-6">
              <p className="text-gold-matte/80 text-sm mb-2">Tu código:</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-mono font-bold text-white tracking-wider">
                  {promoCode}
                </span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Copiar código"
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-green-400 text-sm mt-2 animate-fade-in">
                  ¡Copiado al portapapeles!
                </p>
              )}
            </div>

            <p className="text-sm text-charcoal-500 mb-6">
              Usa este código en tu próxima compra para obtener un descuento especial.
            </p>

            <button
              type="button"
              onClick={handleSuccessClose}
              className="px-8 py-3 bg-navy-900 text-white font-medium rounded-lg hover:bg-navy-800 transition-colors"
            >
              Ir a comprar
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
