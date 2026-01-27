/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Checkout Component con Stripe - Formulario Clásico de Tarjeta
 * Campos separados: Número de tarjeta, Fecha de expiración, CVV
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef } from 'react';
import { loadStripe, type Stripe, type StripeCardElement } from '@stripe/stripe-js';

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
  amount?: number;
  items?: CartItem[];
  shippingAddress?: ShippingAddress;
  customerNif?: string;
  discountCodeId?: string;
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

// Helper para obtener el código de descuento aplicado
const getAppliedDiscountFromStorage = (): { discount_code_id: string; code: string; discount_amount: number } | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem('fashionmarket-applied-discount');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Helper para obtener opciones de checkout
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

// Helper para obtener la dirección de envío
const getShippingAddressFromStorage = (): ShippingAddress | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem('fashionmarket-shipping-address');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export default function CheckoutForm({ 
  amount: propAmount, 
  items: propItems, 
  shippingAddress, 
  customerNif, 
  discountCodeId: propDiscountCodeId, 
  onSuccess, 
  onError 
}: CheckoutFormProps) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [cardElement, setCardElement] = useState<StripeCardElement | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [cardError, setCardError] = useState<string>('');
  const [succeeded, setSucceeded] = useState(false);
  const [orderInfo, setOrderInfo] = useState<{ orderId?: string; invoiceId?: string; invoiceNumber?: string } | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  
  // Refs para los elementos
  const cardElementRef = useRef<HTMLDivElement>(null);
  const cardMounted = useRef(false);
  
  // Estado del carrito
  const [cartData, setCartData] = useState<{ items: CartItem[]; total: number }>({ items: [], total: 0 });
  
  // Estado del descuento
  const [discountCodeId, setDiscountCodeId] = useState<string | undefined>(propDiscountCodeId);
  
  // Estado de las opciones de checkout
  const [checkoutOptions, setCheckoutOptions] = useState(getCheckoutOptionsFromStorage());
  
  // Estado de la dirección de envío
  const [storedShippingAddress, setStoredShippingAddress] = useState<ShippingAddress | null>(null);
  
  // Nombre del titular de la tarjeta
  const [cardholderName, setCardholderName] = useState('');
  
  // Obtener datos al montar
  useEffect(() => {
    const data = getCartFromStorage();
    setCartData(data);
    
    if (!propDiscountCodeId) {
      const appliedDiscount = getAppliedDiscountFromStorage();
      if (appliedDiscount?.discount_code_id) {
        setDiscountCodeId(appliedDiscount.discount_code_id);
      }
    }
    
    setCheckoutOptions(getCheckoutOptionsFromStorage());
    
    if (!shippingAddress) {
      const stored = getShippingAddressFromStorage();
      setStoredShippingAddress(stored);
      // Pre-llenar nombre del titular con el nombre de envío
      if (stored?.name) {
        setCardholderName(stored.name);
      }
    } else if (shippingAddress.name) {
      setCardholderName(shippingAddress.name);
    }
    
    const handleStorageChange = () => {
      setCheckoutOptions(getCheckoutOptionsFromStorage());
      if (!shippingAddress) {
        setStoredShippingAddress(getShippingAddressFromStorage());
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    const interval = setInterval(() => {
      setCheckoutOptions(getCheckoutOptionsFromStorage());
    }, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [propDiscountCodeId, shippingAddress]);
  
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

  // Crear Payment Intent
  useEffect(() => {
    if (!stripe || !amount || amount <= 0) {
      return;
    }

    const createPaymentIntent = async () => {
      try {
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

        const text = await response.text();
        if (!text) {
          setError('El servidor no devolvió respuesta');
          return;
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch {
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
        setError(err.message || 'Error al inicializar el pago');
      }
    };

    createPaymentIntent();
  }, [stripe, amount]);

  // Crear Card Element cuando tenemos stripe y clientSecret
  useEffect(() => {
    if (!stripe || !clientSecret || !cardElementRef.current || cardMounted.current) return;

    const elements = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#1a1a2e',
          colorBackground: '#ffffff',
          colorText: '#1a1a2e',
          colorDanger: '#dc2626',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSizeBase: '16px',
          borderRadius: '8px',
          spacingUnit: '4px',
        },
        rules: {
          '.Input': {
            border: '1px solid #d1d5db',
            boxShadow: 'none',
            padding: '12px',
          },
          '.Input:focus': {
            border: '2px solid #1a1a2e',
            boxShadow: 'none',
          },
          '.Input--invalid': {
            border: '1px solid #dc2626',
          },
          '.Label': {
            fontWeight: '500',
            marginBottom: '8px',
          },
        },
      },
    });

    // Crear el elemento de tarjeta con todos los campos
    const card = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#1a1a2e',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          '::placeholder': {
            color: '#9ca3af',
          },
          iconColor: '#1a1a2e',
        },
        invalid: {
          color: '#dc2626',
          iconColor: '#dc2626',
        },
      },
      hidePostalCode: true, // Ya tenemos el código postal en el formulario de envío
    });

    card.mount(cardElementRef.current);
    cardMounted.current = true;
    
    // Escuchar cambios en el elemento de tarjeta
    card.on('change', (event) => {
      setCardComplete(event.complete);
      if (event.error) {
        setCardError(event.error.message);
      } else {
        setCardError('');
      }
    });

    setCardElement(card);

    return () => {
      card.unmount();
      cardMounted.current = false;
    };
  }, [stripe, clientSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !cardElement || !clientSecret) {
      return;
    }

    if (!cardholderName.trim()) {
      setError('Por favor, introduce el nombre del titular de la tarjeta');
      return;
    }

    if (!cardComplete) {
      setError('Por favor, completa los datos de la tarjeta');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Obtener dirección de envío
      const finalShippingAddress = shippingAddress || storedShippingAddress || getShippingAddressFromStorage();
      
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName,
            email: finalShippingAddress?.email,
            phone: finalShippingAddress?.phone,
            address: {
              line1: finalShippingAddress?.address_line1,
              city: finalShippingAddress?.city,
              postal_code: finalShippingAddress?.postal_code,
              country: finalShippingAddress?.country || 'ES',
            },
          },
        },
      });

      if (stripeError) {
        // Traducir errores comunes de Stripe
        let errorMessage = stripeError.message || 'Error al procesar el pago';
        
        if (stripeError.code === 'card_declined') {
          errorMessage = 'La tarjeta ha sido rechazada. Por favor, usa otra tarjeta.';
        } else if (stripeError.code === 'expired_card') {
          errorMessage = 'La tarjeta ha expirado. Por favor, usa otra tarjeta.';
        } else if (stripeError.code === 'incorrect_cvc') {
          errorMessage = 'El código de seguridad (CVV) es incorrecto.';
        } else if (stripeError.code === 'insufficient_funds') {
          errorMessage = 'Fondos insuficientes. Por favor, usa otra tarjeta.';
        } else if (stripeError.code === 'invalid_card_number') {
          errorMessage = 'El número de tarjeta no es válido.';
        } else if (stripeError.code === 'invalid_expiry_month' || stripeError.code === 'invalid_expiry_year') {
          errorMessage = 'La fecha de expiración no es válida.';
        }
        
        setError(errorMessage);
        onError?.(errorMessage);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Completar el pedido
        try {
          const currentOptions = getCheckoutOptionsFromStorage();
          const appliedDiscount = getAppliedDiscountFromStorage();
          
          const completeResponse = await fetch('/api/orders/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              items: items || [],
              shippingAddress: finalShippingAddress,
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
            // Limpiar localStorage
            localStorage.removeItem('fashionmarket-cart');
            localStorage.removeItem('fashionmarket-applied-discount');
            localStorage.removeItem('fashionmarket-shipping-address');
            localStorage.removeItem('fashionmarket-checkout-options');
            
            setOrderInfo({
              orderId: completeData.orderId,
              invoiceId: completeData.invoiceId,
              invoiceNumber: completeData.invoiceNumber,
            });
            setSucceeded(true);
            
            window.dispatchEvent(new CustomEvent('payment-success'));
            onSuccess?.(paymentIntent.id, completeData.orderId, completeData.invoiceId);
          } else {
            console.error('Error creating order:', completeData.error);
            setSucceeded(true);
            window.dispatchEvent(new CustomEvent('payment-success'));
            onSuccess?.(paymentIntent.id);
          }
        } catch (completeError) {
          console.error('Error completing order:', completeError);
          setSucceeded(true);
          window.dispatchEvent(new CustomEvent('payment-success'));
          onSuccess?.(paymentIntent.id);
        }
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        // 3D Secure u otra acción requerida - Stripe lo manejará automáticamente
        setError('Se requiere verificación adicional. Por favor, completa el proceso de verificación.');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
      onError?.(err.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  // Loading inicial
  if (!stripe) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900"></div>
        <span className="ml-3 text-charcoal-600">Cargando formulario de pago...</span>
      </div>
    );
  }

  // Carrito vacío
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

  // Pago exitoso
  if (succeeded) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">Pago completado con éxito</h3>
        <p className="text-green-700 mb-4">Tu pedido ha sido procesado correctamente. Recibirás un email de confirmación.</p>
        
        {orderInfo?.invoiceNumber && (
          <p className="text-sm text-green-600 mb-4">
            Número de factura: <span className="font-mono font-semibold">{orderInfo.invoiceNumber}</span>
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
          <a
            href="/tienda"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium"
          >
            Seguir comprando
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Icono de tarjeta */}
      <div className="flex items-center gap-3 pb-4 border-b border-charcoal-200">
        <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-navy-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <div>
          <h3 className="font-medium text-navy-900">Pago con tarjeta</h3>
          <p className="text-sm text-charcoal-500">Introduce los datos de tu tarjeta</p>
        </div>
        {/* Logos de tarjetas aceptadas */}
        <div className="ml-auto flex items-center gap-2">
          <svg className="h-8" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="50" height="35" rx="4" fill="#1A1F71"/>
            <path d="M21.5 23.5L23.5 11.5H27L25 23.5H21.5Z" fill="white"/>
            <path d="M34.5 11.7C33.7 11.4 32.5 11 31 11C27.5 11 25 12.9 25 15.5C25 17.5 26.8 18.5 28.2 19.2C29.6 19.9 30.1 20.3 30.1 20.9C30.1 21.8 29 22.2 28 22.2C26.5 22.2 25.7 22 24.5 21.5L24 21.3L23.5 24.3C24.5 24.7 26.2 25 28 25C31.7 25 34.1 23.1 34.1 20.3C34.1 18.7 33.1 17.5 31.1 16.5C29.8 15.8 29 15.4 29 14.7C29 14.1 29.7 13.5 31.2 13.5C32.5 13.5 33.4 13.8 34.1 14.1L34.5 14.3L35 11.7H34.5Z" fill="white"/>
            <path d="M40 11.5H37.5C36.7 11.5 36 11.7 35.7 12.6L30.5 23.5H34.2L34.9 21.5H39.4L39.8 23.5H43L40 11.5ZM35.8 19C36.2 18 37.7 14.3 37.7 14.3C37.7 14.3 38.1 13.3 38.3 12.7L38.6 14.2C38.6 14.2 39.5 18.3 39.7 19H35.8Z" fill="white"/>
            <path d="M18.5 11.5L15 19.7L14.6 17.8C14 15.8 12.2 13.5 10 12.3L13.2 23.5H17L22.5 11.5H18.5Z" fill="white"/>
            <path d="M12.5 11.5H7L7 11.7C11.5 12.8 14.5 15.5 15.5 18.8L14.5 12.7C14.3 11.8 13.5 11.5 12.5 11.5Z" fill="#F9A51A"/>
          </svg>
          <svg className="h-8" viewBox="0 0 50 35" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="50" height="35" rx="4" fill="#F5F5F5"/>
            <circle cx="19" cy="17.5" r="10" fill="#EB001B"/>
            <circle cx="31" cy="17.5" r="10" fill="#F79E1B"/>
            <path d="M25 10.5C27.4 12.3 29 15.2 29 18.5C29 21.8 27.4 24.7 25 26.5C22.6 24.7 21 21.8 21 18.5C21 15.2 22.6 12.3 25 10.5Z" fill="#FF5F00"/>
          </svg>
        </div>
      </div>

      {/* Nombre del titular */}
      <div>
        <label htmlFor="cardholder-name" className="block text-sm font-medium text-navy-900 mb-2">
          Nombre del titular de la tarjeta
        </label>
        <input
          type="text"
          id="cardholder-name"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="Nombre como aparece en la tarjeta"
          className="w-full px-4 py-3 border border-charcoal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent text-navy-900 placeholder-charcoal-400"
          required
        />
      </div>

      {/* Elemento de tarjeta de Stripe */}
      <div>
        <label className="block text-sm font-medium text-navy-900 mb-2">
          Datos de la tarjeta
        </label>
        <div 
          ref={cardElementRef}
          className="p-4 border border-charcoal-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-navy-500 focus-within:border-transparent"
        />
        {cardError && (
          <p className="mt-2 text-sm text-red-600">{cardError}</p>
        )}
      </div>

      {/* Mensaje de error general */}
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
        disabled={!stripe || !cardElement || loading || !cardComplete}
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
            <span>Pagar {(amount / 100).toFixed(2)}€</span>
          </>
        )}
      </button>

      {/* Mensaje de seguridad */}
      <div className="flex items-center justify-center gap-2 text-xs text-charcoal-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Pago seguro con encriptación SSL de 256 bits</span>
      </div>

      {/* Powered by Stripe */}
      <div className="flex items-center justify-center pt-2">
        <span className="text-xs text-charcoal-400 mr-2">Procesado por</span>
        <svg className="h-5" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg">
          <path fill="#6772e5" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.02 1.04-.06 1.48zm-6.3-5.63c-1.03 0-1.62.76-1.82 2.24h3.74c-.04-1.24-.5-2.24-1.92-2.24zM41.41 20.6V0h5.08v8.95a4.33 4.33 0 0 1 2.95-1.03c3.2 0 4.56 2.95 4.56 6.67 0 5.02-2.5 7.77-5.87 7.77-1.51 0-2.7-.56-3.55-1.41l-.24 1.18h-4.93v-.53zm5.08-7.1c0 2.34.76 3.44 2 3.44.75 0 1.35-.3 1.75-.86.48-.66.73-1.77.73-3.22 0-2.47-.8-3.59-2.07-3.59-.62 0-1.18.2-1.66.68l-.75.76v2.79zm-13.22 1.22c0-3.79 2.55-7.37 7.18-7.37 1.02 0 2.27.3 3.04.7v4.43c-.69-.38-1.69-.69-2.66-.69-1.8 0-2.77 1.12-2.77 2.87 0 1.92.96 2.9 2.64 2.9 1.02 0 2.12-.38 2.79-.74v4.32a8.91 8.91 0 0 1-3.52.76c-4.54 0-6.7-2.93-6.7-7.18zm-7.77 6.1l-.29-1.1c-.86.97-2.08 1.33-3.45 1.33-2.27 0-4.04-1.4-4.04-4.04 0-3.05 2.23-4.52 5.78-4.52.56 0 1.15.05 1.66.14v-.39c0-1.35-.77-1.88-2.31-1.88-1.27 0-2.54.29-3.75.86V6.02c1.1-.43 2.87-.82 4.66-.82 4.12 0 5.54 1.77 5.54 5.34v10.05h-3.8v.23zm-.34-5.54c-.37-.09-.77-.14-1.19-.14-1.39 0-2.18.5-2.18 1.5 0 .84.5 1.32 1.42 1.32.82 0 1.48-.37 1.95-.97v-1.71zM5.16 20.6V7.84H0V5.48h5.16V3.6C5.16 1.14 6.72 0 9.88 0c1.18 0 2.23.14 3.04.38v3.73c-.5-.12-1.07-.17-1.7-.17-1.16 0-1.7.5-1.7 1.5v1.04h3.7v2.36h-3.7V20.6H5.16z"/>
        </svg>
      </div>
    </form>
  );
}
