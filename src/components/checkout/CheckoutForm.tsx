/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASHIONMARKET - Checkout Form Component
 * Formulario de pago con Stripe Elements (React)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
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

// ============================================================================
// STRIPE PAYMENT FORM (Dentro de Elements)
// ============================================================================
function StripePaymentForm({ 
  amount, 
  onSuccess 
}: { 
  amount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe no está listo. Por favor, espera un momento.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const shippingAddress = getShippingAddressFromStorage();
      
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout?success=true`,
          payment_method_data: {
            billing_details: {
              name: shippingAddress?.name || '',
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
        },
        redirect: 'if_required',
      });

      if (submitError) {
        let errorMessage = submitError.message || 'Error al procesar el pago';
        
        if (submitError.code === 'card_declined') {
          errorMessage = 'La tarjeta ha sido rechazada. Por favor, usa otra tarjeta.';
        } else if (submitError.code === 'expired_card') {
          errorMessage = 'La tarjeta ha expirado.';
        } else if (submitError.code === 'incorrect_cvc') {
          errorMessage = 'El código de seguridad (CVV) es incorrecto.';
        } else if (submitError.code === 'insufficient_funds') {
          errorMessage = 'Fondos insuficientes.';
        }
        
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Crear pedido en el servidor
        await createOrder(paymentIntent.id);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Element de Stripe */}
      <div className="bg-white border border-charcoal-200 rounded-lg p-4">
        <PaymentElement 
          onReady={() => setReady(true)}
          options={{
            layout: 'tabs',
          }}
        />
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
        disabled={!stripe || !elements || loading || !ready}
        className="w-full bg-navy-900 text-white py-4 rounded-lg font-semibold hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
      <div className="flex items-center justify-center gap-2 text-xs text-charcoal-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Pago seguro con encriptación SSL de 256 bits</span>
      </div>

      {/* Powered by Stripe */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <span className="text-xs text-charcoal-400">Procesado por</span>
        <svg className="h-5" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg">
          <path fill="#6772e5" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-6.3-5.63c-1.03 0-1.62.76-1.82 2.24h3.74c-.04-1.24-.5-2.24-1.92-2.24zM41.41 20.6V0h5.08v8.95a4.33 4.33 0 0 1 2.95-1.03c3.2 0 4.56 2.95 4.56 6.67 0 5.02-2.5 7.77-5.87 7.77-1.51 0-2.7-.56-3.55-1.41l-.24 1.18h-4.93v-.53zm5.08-7.1c0 2.34.76 3.44 2 3.44.75 0 1.35-.3 1.75-.86.48-.66.73-1.77.73-3.22 0-2.47-.8-3.59-2.07-3.59-.62 0-1.18.2-1.66.68l-.75.76v2.79zm-13.22 1.22c0-3.79 2.55-7.37 7.18-7.37 1.02 0 2.27.3 3.04.7v4.43c-.69-.38-1.69-.69-2.66-.69-1.8 0-2.77 1.12-2.77 2.87 0 1.92.96 2.9 2.64 2.9 1.02 0 2.12-.38 2.79-.74v4.32a8.91 8.91 0 0 1-3.52.76c-4.54 0-6.7-2.93-6.7-7.18zm-7.77 6.1l-.29-1.1c-.86.97-2.08 1.33-3.45 1.33-2.27 0-4.04-1.4-4.04-4.04 0-3.05 2.23-4.52 5.78-4.52.56 0 1.15.05 1.66.14v-.39c0-1.35-.77-1.88-2.31-1.88-1.27 0-2.54.29-3.75.86V6.02c1.1-.43 2.87-.82 4.66-.82 4.12 0 5.54 1.77 5.54 5.34v10.05h-3.8v.23zm-.34-5.54c-.37-.09-.77-.14-1.19-.14-1.39 0-2.18.5-2.18 1.5 0 .84.5 1.32 1.42 1.32.82 0 1.48-.37 1.95-.97v-1.71zM5.16 20.6V7.84H0V5.48h5.16V3.6C5.16 1.14 6.72 0 9.88 0c1.18 0 2.23.14 3.04.38v3.73c-.5-.12-1.07-.17-1.7-.17-1.16 0-1.7.5-1.7 1.5v1.04h3.7v2.36h-3.7V20.6H5.16z"/>
        </svg>
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
  const [checkoutOptions, setCheckoutOptions] = useState({ shippingCost: 0 });
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
    setCheckoutOptions({ shippingCost: options.shippingCost || 0 });
    setDiscount(appliedDiscount?.discount_amount || 0);
    
    // Cargar configuración de la tienda (contrareembolso)
    fetch('/api/store/settings')
      .then(res => res.json())
      .then(data => {
        setCodEnabled(data.payments?.cash_on_delivery_enabled || false);
        setCodFee(data.payments?.cod_extra_cost || 0);
      })
      .catch(() => {});
  }, []);

  // Crear Payment Intent cuando tenemos los datos
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

        console.log('Creating Payment Intent with amount:', amount);
        
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency: 'eur',
          }),
        });

        const data = await response.json();
        console.log('Payment Intent response:', data);

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
    
    try {
      const shippingAddress = getShippingAddressFromStorage();
      const appliedDiscount = getAppliedDiscountFromStorage();
      const options = getCheckoutOptionsFromStorage();

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartData.items,
          shippingAddress,
          shippingMethod: options.shippingMethod || 'standard',
          paymentMethod: 'cash_on_delivery',
          discountCodeId: appliedDiscount?.discount_code_id,
          discountAmount: appliedDiscount?.discount_amount || 0,
          codFee,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Limpiar localStorage
        localStorage.removeItem('fashionmarket-cart');
        localStorage.removeItem('fashionmarket-applied-discount');
        localStorage.removeItem('fashionmarket-shipping-address');
        localStorage.removeItem('fashionmarket-checkout-options');
        
        setSucceeded(true);
        window.dispatchEvent(new CustomEvent('payment-success'));
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
        <div className="h-16 bg-charcoal-100 rounded-lg"></div>
        <div className="h-16 bg-charcoal-100 rounded-lg"></div>
        <div className="h-48 bg-charcoal-100 rounded-lg"></div>
        <div className="h-14 bg-charcoal-200 rounded-lg"></div>
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
            : 'Tu pedido ha sido procesado correctamente.'}
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
      {/* Selector de método de pago */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-navy-900 mb-3">
          Método de pago
        </label>
        
        {/* Tarjeta */}
        <label 
          className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
            paymentMethod === 'card' 
              ? 'border-navy-900 bg-navy-50' 
              : 'border-charcoal-200 hover:border-charcoal-300'
          }`}
        >
          <input
            type="radio"
            name="payment"
            value="card"
            checked={paymentMethod === 'card'}
            onChange={() => setPaymentMethod('card')}
            className="w-5 h-5 text-navy-900"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-navy-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="font-medium text-navy-900">Tarjeta de crédito/débito</span>
            </div>
            <p className="text-xs text-charcoal-500 mt-1">Visa, Mastercard, American Express</p>
          </div>
          <div className="flex gap-1">
            <div className="w-8 h-5 bg-[#1A1F71] rounded flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">VISA</span>
            </div>
            <div className="w-8 h-5 bg-gradient-to-r from-red-500 to-yellow-500 rounded"></div>
          </div>
        </label>

        {/* Contrareembolso */}
        {codEnabled && (
          <label 
            className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
              paymentMethod === 'cod' 
                ? 'border-navy-900 bg-navy-50' 
                : 'border-charcoal-200 hover:border-charcoal-300'
            }`}
          >
            <input
              type="radio"
              name="payment"
              value="cod"
              checked={paymentMethod === 'cod'}
              onChange={() => setPaymentMethod('cod')}
              className="w-5 h-5 text-navy-900"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-medium text-navy-900">Contrareembolso</span>
              </div>
              <p className="text-xs text-charcoal-500 mt-1">Paga en efectivo al recibir tu pedido</p>
            </div>
            {codFee > 0 && (
              <span className="text-sm font-medium text-amber-600">+{formatPrice(codFee)}</span>
            )}
          </label>
        )}
      </div>

      {/* Error general */}
      {error && paymentMethod === 'card' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-red-700 text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-red-600 text-sm underline mt-2 hover:no-underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de tarjeta con Stripe Elements */}
      {paymentMethod === 'card' && (
        <>
          {loading ? (
            <div className="border border-charcoal-200 rounded-lg p-8">
              <div className="flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-charcoal-200 border-t-navy-900"></div>
                <p className="mt-4 text-charcoal-600">Cargando formulario de pago...</p>
              </div>
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
                    colorBackground: '#ffffff',
                    colorText: '#1a1a2e',
                    colorDanger: '#dc2626',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    borderRadius: '8px',
                  },
                },
                locale: 'es',
              }}
            >
              <StripePaymentForm 
                amount={totalAmount}
                onSuccess={handleCardSuccess}
              />
            </Elements>
          ) : (
            <div className="border border-red-200 bg-red-50 rounded-lg p-6 text-center">
              <p className="text-red-700 mb-4">No se pudo cargar el formulario de pago</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Reintentar
              </button>
            </div>
          )}
        </>
      )}

      {/* Formulario de contrareembolso */}
      {paymentMethod === 'cod' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-amber-800 font-medium">Pago al recibir</p>
                <p className="text-amber-700 text-sm mt-1">
                  El repartidor cobrará {formatPrice(totalAmount)} al entregar tu pedido.
                </p>
              </div>
            </div>
          </div>

          {/* Resumen con cargo COD */}
          {codFee > 0 && (
            <div className="bg-charcoal-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-charcoal-600">Subtotal + envío</span>
                <span>{formatPrice(cartData.total + checkoutOptions.shippingCost - discount)}</span>
              </div>
              <div className="flex justify-between text-amber-600">
                <span>Cargo contrareembolso</span>
                <span>+{formatPrice(codFee)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-charcoal-200">
                <span>Total a pagar</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleCodPayment}
            disabled={processingCod}
            className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
