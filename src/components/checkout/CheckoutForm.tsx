/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Checkout Component con Stripe
 * Formulario de pago con tarjeta, Apple Pay y Google Pay
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';

interface CartItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  size: string;
  image: string;
  maxStock: number;
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

interface CheckoutFormProps {
  amount?: number; // Monto en céntimos (opcional - si no se pasa, lee del carrito)
  items?: CartItem[];
  shippingAddress?: ShippingAddress;
  customerNif?: string;
  discountCodeId?: string; // ID del código de descuento aplicado
  onSuccess?: (paymentIntentId: string, orderId?: string, invoiceId?: string) => void;
  onError?: (error: string) => void;
}

// Helper para leer el carrito del localStorage
const getCartFromStorage = (): { items: CartItem[]; total: number } => {
  if (typeof window === 'undefined') return { items: [], total: 0 };
  
  try {
    const saved = localStorage.getItem('fashionmarket-cart');
    const items: CartItem[] = saved ? JSON.parse(saved) : [];
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { items, total };
  } catch {
    return { items: [], total: 0 };
  }
};

// Helper para obtener el código de descuento aplicado desde localStorage
const getAppliedDiscountFromStorage = (): { discount_code_id: string; code: string; discount_amount: number } | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem('fashionmarket-applied-discount');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Helper para obtener opciones de checkout desde localStorage
const getCheckoutOptionsFromStorage = (): { shippingMethod: string; paymentMethod: string; shippingCost: number; codCost: number } => {
  if (typeof window === 'undefined') {
    return { shippingMethod: 'standard', paymentMethod: 'card', shippingCost: 499, codCost: 0 };
  }
  
  try {
    const saved = localStorage.getItem('fashionmarket-checkout-options');
    return saved ? JSON.parse(saved) : { shippingMethod: 'standard', paymentMethod: 'card', shippingCost: 499, codCost: 0 };
  } catch {
    return { shippingMethod: 'standard', paymentMethod: 'card', shippingCost: 499, codCost: 0 };
  }
};

export default function CheckoutForm({ amount: propAmount, items: propItems, shippingAddress, customerNif, discountCodeId: propDiscountCodeId, onSuccess, onError }: CheckoutFormProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [succeeded, setSucceeded] = useState(false);
  const [orderInfo, setOrderInfo] = useState<{ orderId?: string; invoiceId?: string; invoiceNumber?: string } | null>(null);
  
  // Estado del carrito
  const [cartData, setCartData] = useState<{ items: CartItem[]; total: number }>({ items: [], total: 0 });
  
  // Estado del descuento (se lee de localStorage o de props)
  const [discountCodeId, setDiscountCodeId] = useState<string | undefined>(propDiscountCodeId);
  
  // Estado de las opciones de checkout
  const [checkoutOptions, setCheckoutOptions] = useState(getCheckoutOptionsFromStorage());
  
  // Obtener datos del carrito y descuento al montar el componente
  useEffect(() => {
    const data = getCartFromStorage();
    setCartData(data);
    
    // Leer descuento aplicado de localStorage si no viene por props
    if (!propDiscountCodeId) {
      const appliedDiscount = getAppliedDiscountFromStorage();
      if (appliedDiscount?.discount_code_id) {
        setDiscountCodeId(appliedDiscount.discount_code_id);
      }
    }
    
    // Leer opciones de checkout
    setCheckoutOptions(getCheckoutOptionsFromStorage());
    
    // Escuchar cambios en localStorage para actualizar opciones
    const handleStorageChange = () => {
      setCheckoutOptions(getCheckoutOptionsFromStorage());
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // También actualizar periódicamente por si cambian las opciones en la misma página
    const interval = setInterval(() => {
      setCheckoutOptions(getCheckoutOptionsFromStorage());
    }, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [propDiscountCodeId]);
  
  // Usar el amount proporcionado o el del carrito
  const amount = propAmount && propAmount > 0 ? propAmount : cartData.total;
  const items = propItems || cartData.items;

  // Cargar Stripe
  useEffect(() => {
    const initializeStripe = async () => {
      const stripeKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!stripeKey) {
        setError('Configuración de Stripe no encontrada');
        return;
      }

      const stripeInstance = await loadStripe(stripeKey);
      setStripe(stripeInstance);
    };

    initializeStripe();
  }, []);

  // Crear Payment Intent cuando tengamos el monto del carrito
  useEffect(() => {
    if (!stripe || !amount || amount <= 0) {
      console.log('Esperando datos para crear PaymentIntent:', { stripe: !!stripe, amount });
      return;
    }

    const createPaymentIntent = async () => {
      try {
        console.log('Creando PaymentIntent con monto:', amount);
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency: 'eur',
            metadata: {
              itemCount: items.length,
            },
          }),
        });

        // Verificar que la respuesta sea válida antes de parsear JSON
        const text = await response.text();
        if (!text) {
          setError('El servidor no devolvió respuesta');
          return;
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('Error parsing JSON:', text);
          setError('Error al procesar la respuesta del servidor');
          return;
        }

        if (data.error) {
          setError(data.error);
          return;
        }

        if (!data.clientSecret) {
          setError('No se recibió el clientSecret de Stripe');
          return;
        }

        setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error('Error creating payment intent:', err);
        setError(err.message || 'Error al inicializar el pago');
      }
    };

    createPaymentIntent();
  }, [stripe, amount]);

  // Crear Elements cuando tenemos clientSecret
  useEffect(() => {
    if (!stripe || !clientSecret) return;

    const elementsInstance = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#1a1a2e',
          colorBackground: '#ffffff',
          colorText: '#1a1a2e',
          colorDanger: '#df1b41',
          fontFamily: 'system-ui, sans-serif',
          borderRadius: '8px',
        },
      },
    });

    setElements(elementsInstance);
  }, [stripe, clientSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/cuenta/pedidos`,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        setError(submitError.message || 'Error al procesar el pago');
        onError?.(submitError.message || 'Error al procesar el pago');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Llamar a la API para completar el pedido y generar factura
        try {
          // Obtener opciones actualizadas
          const currentOptions = getCheckoutOptionsFromStorage();
          const appliedDiscount = getAppliedDiscountFromStorage();
          
          const completeResponse = await fetch('/api/orders/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              items: items || [],
              shippingAddress: shippingAddress,
              shippingMethod: currentOptions.shippingMethod,
              paymentMethod: 'card',
              customerNif: customerNif,
              discountCodeId: discountCodeId || appliedDiscount?.discount_code_id,
              discountCode: appliedDiscount?.code,
              discountAmount: appliedDiscount?.discount_amount || 0,
            }),
          });

          const completeData = await completeResponse.json();
          
          if (completeData.success) {
            // Limpiar carrito y descuento aplicado del localStorage
            localStorage.removeItem('fashionmarket-cart');
            localStorage.removeItem('fashionmarket-applied-discount');
            
            setOrderInfo({
              orderId: completeData.orderId,
              invoiceId: completeData.invoiceId,
              invoiceNumber: completeData.invoiceNumber,
            });
            setSucceeded(true);
            onSuccess?.(paymentIntent.id, completeData.orderId, completeData.invoiceId);
          } else {
            // Pago exitoso pero error al crear pedido - aún así mostramos éxito
            console.error('Error creating order:', completeData.error);
            setSucceeded(true);
            onSuccess?.(paymentIntent.id);
          }
        } catch (completeError) {
          // Pago exitoso pero error al crear pedido
          console.error('Error completing order:', completeError);
          setSucceeded(true);
          onSuccess?.(paymentIntent.id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
      onError?.(err.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar elemento de pago cuando esté listo
  useEffect(() => {
    if (!elements) return;

    const paymentElement = elements.create('payment', {
      layout: {
        type: 'tabs',
        defaultCollapsed: false,
      },
    });

    paymentElement.mount('#payment-element');

    return () => {
      paymentElement.unmount();
    };
  }, [elements]);

  // Loading inicial mientras se carga Stripe
  if (!stripe) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  // Si el carrito está vacío
  if (amount <= 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Carrito vacío</h3>
        <p className="text-yellow-700 mb-4">Añade productos a tu carrito para continuar</p>
        <a
          href="/tienda"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
        >
          Ir a la tienda
        </a>
      </div>
    );
  }

  if (succeeded) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">¡Pago completado!</h3>
        <p className="text-green-700 mb-4">Tu pedido ha sido procesado correctamente</p>
        
        {orderInfo?.invoiceNumber && (
          <p className="text-sm text-green-600 mb-4">
            Factura: <span className="font-mono font-semibold">{orderInfo.invoiceNumber}</span>
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <a
            href="/cuenta/pedidos"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Ver mis pedidos
          </a>
          {orderInfo?.invoiceId && (
            <a
              href={`/api/invoices/${orderInfo.invoiceId}`}
              target="_blank"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Ver factura
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Elemento de pago de Stripe (incluye tarjeta, Apple Pay, Google Pay, etc.) */}
      <div id="payment-element" className="mb-6"></div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Botón de pago */}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-navy-900 text-white py-4 rounded-lg font-semibold hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Procesando...
          </span>
        ) : (
          `Pagar ${(amount / 100).toFixed(2)}€`
        )}
      </button>

      {/* Mensaje de seguridad */}
      <p className="text-xs text-charcoal-500 text-center">
        Pago seguro procesado por Stripe. Tus datos están protegidos con encriptación SSL.
      </p>
    </form>
  );
}
