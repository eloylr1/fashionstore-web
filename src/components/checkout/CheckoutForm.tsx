/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Checkout Form Component
 * Formulario de pago con Stripe Card Element (React)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Inicializar Stripe fuera del componente
const stripePromise = loadStripe(import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface CartItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image: string;
  maxStock?: number;
}

interface ShippingAddress {
  name: string;
  email: string;
  phone?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  country: string;
}

// Helpers para localStorage
const getCartFromStorage = (): { items: CartItem[]; total: number } => {
  if (typeof window === 'undefined') return { items: [], total: 0 };
  try {
    const saved = localStorage.getItem('fashionmarket-cart');
    if (!saved) return { items: [], total: 0 };
    const items: CartItem[] = JSON.parse(saved);
    if (!Array.isArray(items) || items.length === 0) return { items: [], total: 0 };
    const total = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
    return { items, total };
  } catch {
    return { items: [], total: 0 };
  }
};

const getAppliedDiscountFromStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('fashionmarket-applied-discount');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const getCheckoutOptionsFromStorage = () => {
  if (typeof window === 'undefined') {
    return { shippingMethod: 'standard', shippingCost: 0 };
  }
  try {
    const saved = localStorage.getItem('fashionmarket-checkout-options');
    return saved ? JSON.parse(saved) : { shippingMethod: 'standard', shippingCost: 0 };
  } catch {
    return { shippingMethod: 'standard', shippingCost: 0 };
  }
};

const getShippingAddressFromStorage = (): ShippingAddress | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('fashionmarket-shipping-address');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
};

// Estilos para los elementos de Stripe
const cardElementStyle = {
  base: {
    fontSize: '16px',
    color: '#1a1a2e',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    '::placeholder': {
      color: '#9ca3af',
    },
  },
  invalid: {
    color: '#dc2626',
    iconColor: '#dc2626',
  },
};

// ============================================================================
// STRIPE CARD FORM (Dentro de Elements)
// ============================================================================
function StripeCardForm({ 
  amount,
  clientSecret,
  onSuccess 
}: { 
  amount: number;
  clientSecret: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [cardComplete, setCardComplete] = useState({
    cardNumber: false,
    cardExpiry: false,
    cardCvc: false,
  });

  const isFormComplete = cardholderName.trim() !== '' && 
    cardComplete.cardNumber && 
    cardComplete.cardExpiry && 
    cardComplete.cardCvc;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe no está disponible. Recarga la página.');
      return;
    }

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      setError('Error al cargar el formulario de tarjeta.');
      return;
    }

    if (!cardholderName.trim()) {
      setError('Por favor, introduce el nombre del titular de la tarjeta.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const shippingAddress = getShippingAddressFromStorage();
      
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardNumberElement,
            billing_details: {
              name: cardholderName,
              email: shippingAddress?.email || '',
              phone: shippingAddress?.phone || '',
              address: {
                line1: shippingAddress?.address_line1 || '',
                city: shippingAddress?.city || '',
                postal_code: shippingAddress?.postal_code || '',
                country: shippingAddress?.country || 'ES',
              },
            },
          },
        }
      );

      if (stripeError) {
        let errorMessage = stripeError.message || 'Error al procesar el pago';
        
        switch (stripeError.code) {
          case 'card_declined':
            errorMessage = 'La tarjeta ha sido rechazada. Por favor, usa otra tarjeta.';
            break;
          case 'expired_card':
            errorMessage = 'La tarjeta ha expirado.';
            break;
          case 'incorrect_cvc':
            errorMessage = 'El código de seguridad (CVV) es incorrecto.';
            break;
          case 'insufficient_funds':
            errorMessage = 'Fondos insuficientes en la tarjeta.';
            break;
          case 'processing_error':
            errorMessage = 'Error de procesamiento. Inténtalo de nuevo.';
            break;
        }
        
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        await createOrder(paymentIntent.id);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al procesar el pago');
      setLoading(false);
    }
  };

  const createOrder = async (paymentIntentId: string) => {
    const cartData = getCartFromStorage();
    const shippingAddress = getShippingAddressFromStorage();
    const checkoutOptions = getCheckoutOptionsFromStorage();
    const appliedDiscount = getAppliedDiscountFromStorage();

    try {
      await fetch('/api/orders/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId,
          items: cartData.items,
          shippingAddress,
          shippingMethod: checkoutOptions.shippingMethod,
          paymentMethod: 'card',
          discountCodeId: appliedDiscount?.discount_code_id,
          discountAmount: appliedDiscount?.discount_amount || 0,
        }),
      });
    } catch (err) {
      console.error('Error creating order:', err);
    }

    // Limpiar localStorage
    localStorage.removeItem('fashionmarket-cart');
    localStorage.removeItem('fashionmarket-applied-discount');
    localStorage.removeItem('fashionmarket-shipping-address');
    localStorage.removeItem('fashionmarket-checkout-options');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre del titular */}
      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-2">
          Nombre del titular
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="Como aparece en la tarjeta"
          className="w-full px-4 py-3 border border-charcoal-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-navy-500 transition-colors"
          required
        />
      </div>

      {/* Número de tarjeta */}
      <div>
        <label className="block text-sm font-medium text-charcoal-700 mb-2">
          Número de tarjeta
        </label>
        <div className="relative">
          <div className="w-full px-4 py-3 border border-charcoal-300 rounded-lg focus-within:ring-2 focus-within:ring-navy-500 focus-within:border-navy-500 transition-colors bg-white">
            <CardNumberElement
              options={{
                style: cardElementStyle,
                placeholder: '1234 5678 9012 3456',
                showIcon: true,
              }}
              onChange={(e) => setCardComplete(prev => ({ ...prev, cardNumber: e.complete }))}
            />
          </div>
        </div>
      </div>

      {/* Fecha y CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-2">
            Fecha de expiración
          </label>
          <div className="w-full px-4 py-3 border border-charcoal-300 rounded-lg focus-within:ring-2 focus-within:ring-navy-500 focus-within:border-navy-500 transition-colors bg-white">
            <CardExpiryElement
              options={{
                style: cardElementStyle,
                placeholder: 'MM / AA',
              }}
              onChange={(e) => setCardComplete(prev => ({ ...prev, cardExpiry: e.complete }))}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-2">
            CVV
          </label>
          <div className="w-full px-4 py-3 border border-charcoal-300 rounded-lg focus-within:ring-2 focus-within:ring-navy-500 focus-within:border-navy-500 transition-colors bg-white">
            <CardCvcElement
              options={{
                style: cardElementStyle,
                placeholder: '123',
              }}
              onChange={(e) => setCardComplete(prev => ({ ...prev, cardCvc: e.complete }))}
            />
          </div>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Botón de pago */}
      <button
        type="submit"
        disabled={!stripe || loading || !isFormComplete}
        className="w-full bg-navy-900 text-white py-4 rounded-lg font-semibold hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-6"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span>Procesando pago...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Pagar {formatPrice(amount)}</span>
          </>
        )}
      </button>

      {/* Seguridad */}
      <div className="flex items-center justify-center gap-2 text-xs text-charcoal-500 pt-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Pago 100% seguro con encriptación SSL</span>
      </div>

      {/* Logos de tarjetas y Stripe */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <div className="flex gap-2">
          {/* Visa */}
          <div className="w-10 h-6 bg-white border border-charcoal-200 rounded flex items-center justify-center">
            <svg viewBox="0 0 48 16" className="h-3">
              <path fill="#1A1F71" d="M19.5 1.2L12.6 14.8h-3.5L5.8 4.1c-.2-.7-.4-1-.9-1.3-.8-.4-2.2-.9-3.4-1.1l.1-.5h5.6c.7 0 1.4.5 1.5 1.3l1.4 7.3 3.4-8.6h3.5zm5.3 0l-2.7 13.6h-3.3l2.7-13.6h3.3zm11.5 9.2c0-3.6-5-3.8-5-5.4 0-.5.5-1 1.5-1.1.5-.1 1.9-.1 3.4.6l.6-2.9c-.8-.3-1.9-.6-3.2-.6-3.4 0-5.8 1.8-5.8 4.4 0 1.9 1.7 3 3 3.6 1.4.6 1.8 1.1 1.8 1.6 0 .9-.8 1.3-1.9 1.3-1.6 0-2.5-.4-3.2-.8l-.6 2.8c.7.3 2.1.6 3.5.6 3.6.1 6-1.7 6-4.5l-.1.4zm8.9 4.4L48 1.2h-3c-.6 0-1.2.4-1.4 1l-5 12.6h3.5l.7-1.9h4.3l.4 1.9h3.1l-2.4-9.8 1.1-.4zm-3.7-4.6l1.8-4.8.8 4.8h-2.6z"/>
            </svg>
          </div>
          {/* Mastercard */}
          <div className="w-10 h-6 bg-white border border-charcoal-200 rounded flex items-center justify-center overflow-hidden">
            <div className="flex">
              <div className="w-4 h-4 bg-red-500 rounded-full -mr-1"></div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full opacity-80"></div>
            </div>
          </div>
          {/* Amex */}
          <div className="w-10 h-6 bg-[#006FCF] border border-charcoal-200 rounded flex items-center justify-center">
            <span className="text-white text-[6px] font-bold">AMEX</span>
          </div>
        </div>
        <div className="border-l border-charcoal-200 pl-4 flex items-center gap-1">
          <span className="text-[10px] text-charcoal-400">Powered by</span>
          <svg className="h-4" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg">
            <path fill="#6772e5" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-6.3-5.63c-1.03 0-1.62.76-1.82 2.24h3.74c-.04-1.24-.5-2.24-1.92-2.24zM41.41 20.6V0h5.08v8.95a4.33 4.33 0 0 1 2.95-1.03c3.2 0 4.56 2.95 4.56 6.67 0 5.02-2.5 7.77-5.87 7.77-1.51 0-2.7-.56-3.55-1.41l-.24 1.18h-4.93v-.53zm5.08-7.1c0 2.34.76 3.44 2 3.44.75 0 1.35-.3 1.75-.86.48-.66.73-1.77.73-3.22 0-2.47-.8-3.59-2.07-3.59-.62 0-1.18.2-1.66.68l-.75.76v2.79zm-13.22 1.22c0-3.79 2.55-7.37 7.18-7.37 1.02 0 2.27.3 3.04.7v4.43c-.69-.38-1.69-.69-2.66-.69-1.8 0-2.77 1.12-2.77 2.87 0 1.92.96 2.9 2.64 2.9 1.02 0 2.12-.38 2.79-.74v4.32a8.91 8.91 0 0 1-3.52.76c-4.54 0-6.7-2.93-6.7-7.18z"/>
          </svg>
        </div>
      </div>
    </form>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function CheckoutForm() {
  const [mounted, setMounted] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [succeeded, setSucceeded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('card');
  const [codEnabled, setCodEnabled] = useState(false);
  const [codFee, setCodFee] = useState(0);
  const [processingCod, setProcessingCod] = useState(false);
  
  // Datos calculados
  const [cartData, setCartData] = useState({ items: [] as CartItem[], total: 0 });
  const [checkoutOptions, setCheckoutOptions] = useState({ shippingCost: 0, shippingMethod: 'standard' });
  const [discount, setDiscount] = useState(0);

  // Calcular total
  const totalAmount = cartData.total + checkoutOptions.shippingCost - discount + (paymentMethod === 'cod' ? codFee : 0);

  useEffect(() => {
    setMounted(true);
    
    // Cargar datos del localStorage
    const cart = getCartFromStorage();
    const options = getCheckoutOptionsFromStorage();
    const appliedDiscount = getAppliedDiscountFromStorage();
    
    setCartData(cart);
    setCheckoutOptions({ 
      shippingCost: options.shippingCost || 0,
      shippingMethod: options.shippingMethod || 'standard'
    });
    setDiscount(appliedDiscount?.discount_amount || 0);
    
    // Cargar configuración de la tienda
    fetch('/api/store/settings')
      .then(res => res.json())
      .then(data => {
        setCodEnabled(data.payments?.cash_on_delivery_enabled || false);
        setCodFee(data.payments?.cod_extra_cost || 0);
      })
      .catch(() => {});
  }, []);

  // Crear Payment Intent
  useEffect(() => {
    if (!mounted || cartData.total <= 0) return;

    const createPaymentIntent = async () => {
      setLoading(true);
      setError(null);

      try {
        const amount = cartData.total + checkoutOptions.shippingCost - discount;
        
        if (amount <= 0) {
          setError('El importe del pedido no es válido');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency: 'eur',
          }),
        });

        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError('No se pudo inicializar el pago');
        }
      } catch (err: any) {
        setError('Error al conectar con el servidor de pagos');
        console.error('Error creating payment intent:', err);
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [mounted, cartData.total, checkoutOptions.shippingCost, discount]);

  // Manejar pago contrareembolso
  const handleCodPayment = async () => {
    setProcessingCod(true);
    setError(null);
    
    try {
      const shippingAddress = getShippingAddressFromStorage();
      const appliedDiscount = getAppliedDiscountFromStorage();

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartData.items,
          shippingAddress,
          shippingMethod: checkoutOptions.shippingMethod,
          paymentMethod: 'cash_on_delivery',
          discountCodeId: appliedDiscount?.discount_code_id,
          discountAmount: appliedDiscount?.discount_amount || 0,
          codFee,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.removeItem('fashionmarket-cart');
        localStorage.removeItem('fashionmarket-applied-discount');
        localStorage.removeItem('fashionmarket-shipping-address');
        localStorage.removeItem('fashionmarket-checkout-options');
        
        setSucceeded(true);
        window.dispatchEvent(new CustomEvent('payment-success'));
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items: [] } }));
      } else {
        setError(data.error || 'Error al procesar el pedido');
      }
    } catch (err: any) {
      setError('Error al procesar el pedido');
    } finally {
      setProcessingCod(false);
    }
  };

  // Manejar éxito de pago con tarjeta
  const handleCardSuccess = () => {
    setSucceeded(true);
    window.dispatchEvent(new CustomEvent('payment-success'));
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items: [] } }));
  };

  // Estado de carga inicial
  if (!mounted) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-charcoal-100 rounded-lg"></div>
        <div className="h-20 bg-charcoal-100 rounded-lg"></div>
        <div className="h-48 bg-charcoal-100 rounded-lg"></div>
      </div>
    );
  }

  // Carrito vacío
  if (cartData.items.length === 0 && cartData.total <= 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Carrito vacío</h3>
        <p className="text-yellow-700 mb-4">Añade productos para continuar</p>
        <a href="/tienda" className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition">
          Ir a la tienda
        </a>
      </div>
    );
  }

  // Pago exitoso
  if (succeeded) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-green-900 mb-2">
          {paymentMethod === 'cod' ? '¡Pedido confirmado!' : '¡Pago completado!'}
        </h3>
        <p className="text-green-700 mb-6">
          {paymentMethod === 'cod' 
            ? 'Tu pedido ha sido registrado. Pagarás al recibir el paquete.'
            : 'Tu pedido ha sido procesado correctamente. Recibirás un email de confirmación.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/cuenta/pedidos" className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
            Ver mis pedidos
          </a>
          <a href="/tienda" className="px-6 py-3 border border-green-300 text-green-700 rounded-lg font-medium hover:bg-green-100 transition">
            Seguir comprando
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SELECTOR DE MÉTODO DE PAGO */}
      <div>
        <h3 className="text-sm font-semibold text-navy-900 mb-4 uppercase tracking-wide">
          Selecciona método de pago
        </h3>
        
        <div className="space-y-3">
          {/* Opción: Pago con tarjeta */}
          <label 
            className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
              paymentMethod === 'card' 
                ? 'border-navy-900 bg-navy-50 shadow-sm' 
                : 'border-charcoal-200 hover:border-charcoal-300 hover:bg-charcoal-50'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={() => setPaymentMethod('card')}
              className="w-5 h-5 text-navy-900 focus:ring-navy-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-navy-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="font-semibold text-navy-900">Pago con tarjeta</span>
              </div>
              <p className="text-xs text-charcoal-500 mt-1 ml-8">Visa, Mastercard, American Express</p>
            </div>
            <div className="flex gap-1.5">
              <div className="w-9 h-6 bg-[#1A1F71] rounded flex items-center justify-center">
                <span className="text-white text-[7px] font-bold tracking-wide">VISA</span>
              </div>
              <div className="w-9 h-6 bg-gradient-to-r from-red-500 to-yellow-400 rounded flex items-center justify-center">
                <div className="flex -space-x-1">
                  <div className="w-3 h-3 bg-red-600 rounded-full opacity-90"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full opacity-90"></div>
                </div>
              </div>
            </div>
          </label>

          {/* Opción: Contrareembolso */}
          {codEnabled && (
            <label 
              className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                paymentMethod === 'cod' 
                  ? 'border-navy-900 bg-navy-50 shadow-sm' 
                  : 'border-charcoal-200 hover:border-charcoal-300 hover:bg-charcoal-50'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
                className="w-5 h-5 text-navy-900 focus:ring-navy-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-semibold text-navy-900">Contrareembolso</span>
                  {codFee > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      +{formatPrice(codFee)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-charcoal-500 mt-1 ml-8">Paga en efectivo al recibir tu pedido</p>
              </div>
              <div className="w-9 h-6 bg-green-100 rounded flex items-center justify-center">
                <span className="text-green-700 text-lg">€</span>
              </div>
            </label>
          )}
        </div>
      </div>

      {/* FORMULARIO DE PAGO CON TARJETA */}
      {paymentMethod === 'card' && (
        <div className="bg-white border border-charcoal-200 rounded-xl p-6">
          <h4 className="text-sm font-semibold text-charcoal-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-charcoal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Datos de la tarjeta
          </h4>
          
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-charcoal-200 border-t-navy-900"></div>
              <p className="mt-3 text-sm text-charcoal-600">Cargando formulario seguro...</p>
            </div>
          ) : error && !clientSecret ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-700 text-sm mb-3">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
              >
                Reintentar
              </button>
            </div>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#1a1a2e',
                  },
                },
                locale: 'es',
              }}
            >
              <StripeCardForm 
                amount={totalAmount}
                clientSecret={clientSecret}
                onSuccess={handleCardSuccess}
              />
            </Elements>
          ) : null}
        </div>
      )}

      {/* FORMULARIO DE CONTRAREEMBOLSO */}
      {paymentMethod === 'cod' && (
        <div className="bg-white border border-charcoal-200 rounded-xl p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-amber-800 font-medium">Pago al recibir el pedido</p>
                <p className="text-amber-700 text-sm mt-1">
                  El repartidor cobrará <strong>{formatPrice(totalAmount)}</strong> en efectivo al entregar tu pedido.
                </p>
              </div>
            </div>
          </div>

          {/* Desglose si hay cargo por COD */}
          {codFee > 0 && (
            <div className="bg-charcoal-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between text-charcoal-600">
                <span>Subtotal productos</span>
                <span>{formatPrice(cartData.total)}</span>
              </div>
              {checkoutOptions.shippingCost > 0 && (
                <div className="flex justify-between text-charcoal-600">
                  <span>Envío</span>
                  <span>{formatPrice(checkoutOptions.shippingCost)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-amber-600">
                <span>Cargo contrareembolso</span>
                <span>+{formatPrice(codFee)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-charcoal-200 text-navy-900">
                <span>Total a pagar</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleCodPayment}
            disabled={processingCod}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {processingCod ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Procesando pedido...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Confirmar pedido - {formatPrice(totalAmount)}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
